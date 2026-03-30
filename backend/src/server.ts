import { PrismaClient } from "@prisma/client";
import app from "./app";

const prisma = new PrismaClient();

const PORT = process.env.PORT ?? 3000;

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log("Database connected");

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

bootstrap();
