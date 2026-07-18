import "dotenv/config";
import { spawn, execFile } from "child_process";
import { createConnection } from "net";
import { access, mkdir, unlink } from "fs/promises";
import { join } from "path";
import prisma from "./lib/prisma";
import app from "./app";

const PORT = Number(process.env.PORT ?? 3001);
const MONGO_PORT = Number(process.env.MONGO_PORT ?? 27017);
// Default to a project-local directory so no sudo is needed
const MONGO_DATA_DIR =
  process.env.MONGO_DATA_DIR ??
  join(__dirname, "..", "data", "mongodb");
const MONGO_REPLICA_SET = process.env.MONGO_REPLICA_SET ?? "rs0";

// ─── MongoDB auto-start ─────────────────────────────────────────

/** Check if a TCP port is accepting connections. */
function isPortOpen(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port, timeout: timeoutMs }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/** Run a mongosh command and return stdout. */
async function runMongosh(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "mongosh",
      ["--quiet", "--port", String(MONGO_PORT), "--eval", cmd],
      { timeout: 10_000 },
      (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout.trim());
      },
    );
  });
}

/** Ensure the replica set is initialised. */
async function ensureReplicaSet(): Promise<void> {
  try {
    const status = await runMongosh("rs.status().ok");
    if (status === "1") {
      console.log("MongoDB replica set already initialised.");
      return;
    }
  } catch {
    // Not initialised yet; fall through.
  }

  console.log("Initialising MongoDB replica set...");
  try {
    await runMongosh(
      `rs.initiate({ _id: "${MONGO_REPLICA_SET}", members: [{ _id: 0, host: "localhost:${MONGO_PORT}" }] })`,
    );
    console.log("MongoDB replica set initialised.");
  } catch (err) {
    console.error("Failed to initialise replica set:", err);
  }
}

/** Start mongod if it isn't already running. */
async function ensureMongoRunning(): Promise<void> {
  const alreadyOpen = await isPortOpen("localhost", MONGO_PORT);
  if (alreadyOpen) {
    console.log("MongoDB is already running.");
    await ensureReplicaSet();
    return;
  }

  // Create the data directory if it doesn't exist
  try {
    await access(MONGO_DATA_DIR);
  } catch {
    // Directory doesn't exist - create it (including parents)
    await mkdir(MONGO_DATA_DIR, { recursive: true });
    console.log(`Created MongoDB data directory: ${MONGO_DATA_DIR}`);
  }

  // Remove stale lock file from unclean shutdown or data copy
  const lockFile = join(MONGO_DATA_DIR, "mongod.lock");
  try {
    await unlink(lockFile);
    console.log("Removed stale mongod.lock");
  } catch {
    // No lock file, that's fine
  }

  console.log("Starting MongoDB...");

  const mongod = spawn("mongod", [
    "--replSet",
    MONGO_REPLICA_SET,
    "--dbpath",
    MONGO_DATA_DIR,
    "--bind_ip",
    "127.0.0.1",
    "--port",
    String(MONGO_PORT),
  ], {
    stdio: ["ignore", "ignore", "ignore"],
    detached: false,
  });

  mongod.on("error", (err) => {
    console.error("Failed to start mongod:", err.message);
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.error("mongod is not installed or not on PATH.");
      console.error("Install MongoDB Community Edition or use Docker.");
    }
  });

  mongod.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`mongod exited with code ${code}`);
    }
  });

  // Wait for MongoDB to accept connections (poll up to 15 s)
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const open = await isPortOpen("localhost", MONGO_PORT);
    if (open) {
      console.log("MongoDB started.");
      // Give it a brief moment to stabilise
      await new Promise((r) => setTimeout(r, 500));
      await ensureReplicaSet();
      return;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.error("Timed out waiting for MongoDB to start.");
}

// ─── Bootstrap ───────────────────────────────────────────────────

async function bootstrap() {
  try {
    if (process.env.NODE_ENV !== "production") {
      // If DATABASE_URL points to a remote host (not localhost/127.0.0.1),
      // skip the local mongod auto-start - MongoDB is handled externally
      // (e.g. by the book-mongo Docker container).
      const dbUrl = process.env.DATABASE_URL ?? "";
      const isLocalMongo =
        dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");
      if (isLocalMongo) {
        await ensureMongoRunning();
      } else {
        console.log("Skipping local MongoDB start - using external MongoDB.");
      }
    }

    await prisma.$connect();
    console.log("Database connected");

    // ─── Data migration: update provider for existing Google OAuth users ──
    // Users who signed up via Google before the provider column existed have
    // provider="EMAIL" (the default). Detect them by checking if their password
    // is NOT a bcrypt hash (Google generates random alphanumeric passwords).
    await migrateGoogleProvider();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment : ${process.env.NODE_ENV ?? "development"}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

/**
 * Update provider to "GOOGLE" for existing users who signed up via Google
 * but still have the default "EMAIL" provider (from before the column was added).
 *
 * Detection: Google OAuth users have a random 16-char alphanumeric password
 * (from Math.random().toString(36).slice(-16)), which does NOT start with "$2".
 * Bcrypt hashes always start with "$2a$", "$2b$", or "$2y$".
 */
async function migrateGoogleProvider(): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: { provider: "EMAIL" },
      select: { id: true, password: true },
    });

    let updated = 0;
    for (const user of users) {
      // Bcrypt hashes start with "$2" - if it doesn't, it's likely a Google-generated password
      if (!user.password.startsWith("$2")) {
        await prisma.user.update({
          where: { id: user.id },
          data: { provider: "GOOGLE" },
        });
        updated++;
      }
    }

    if (updated > 0) {
      console.log(`[Migration] Updated ${updated} existing Google OAuth user(s) to provider="GOOGLE"`);
    }
  } catch (err) {
    console.error("[Migration] Failed to update Google providers:", err);
  }
}

bootstrap();
