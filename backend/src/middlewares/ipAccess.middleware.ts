import { Request, Response, NextFunction } from "express";
import { ipKeyGenerator } from "express-rate-limit";
import prisma from "../lib/prisma";
import { AuditService } from "../services/audit.service";

const audit = new AuditService();

// In-memory cache refreshes periodically to avoid a DB hit on every request
let cachedRules: Array<{ ip: string; type: string }> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

/** Parse an IP (which may be IPv4-mapped IPv6 like ::ffff:192.168.1.1) and normalise it. */
function normalizeIp(raw: string): string {
  // Strip IPv4-mapped IPv6 prefix
  if (raw.startsWith("::ffff:")) return raw.slice(7);
  return raw;
}

/** Check whether a single IP matches a CIDR range. */
function ipInCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes("/")) return ip === cidr;

  const [range, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);

  const ipParts = ip.split(".").map(Number);
  const rangeParts = range.split(".").map(Number);

  if (ipParts.length !== 4 || rangeParts.length !== 4) return false;

  // Convert to 32-bit integer
  const ipInt =
    ((ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]) >>> 0;
  const rangeInt =
    ((rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3]) >>> 0;

  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

/**
 * IP Access Control middleware.
 *
 * - BLOCK rules take priority over ALLOW rules.
 * - If a request IP matches a BLOCK rule, it is rejected immediately.
 * - If a request IP matches an ALLOW rule, it bypasses rate limiting entirely.
 * - If no rules match, the request proceeds normally.
 */
export async function ipAccessMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // ── Refresh cache if stale ──────────────────────────────────────
    const now = Date.now();
    if (!cachedRules || now - cacheTimestamp > CACHE_TTL_MS) {
      const rules = await prisma.ipAccessRule.findMany({
        where: {
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        select: { ip: true, type: true },
      });
      cachedRules = rules;
      cacheTimestamp = now;
    }

    // ── Extract and normalise the client IP ─────────────────────────
    const rawIp = req.ip ?? req.socket.remoteAddress ?? "";
    const clientIp = normalizeIp(rawIp);

    // ── Check rules ─────────────────────────────────────────────────
    let blocked = false;
    const activeRules = cachedRules ?? [];

    for (const rule of activeRules) {
      if (!ipInCidr(clientIp, rule.ip)) continue;

      if (rule.type === "BLOCK") {
        blocked = true;
      }
      // If it's an ALLOW rule, we stop checking — they can pass
      if (rule.type === "ALLOW") {
        // Store an indicator so downstream rate-limiters can skip this IP
        (req as any).ipIsAllowed = true;
        next();
        return;
      }
    }

    if (blocked) {
      audit.log("profile_updated", {
        ip: clientIp,
        userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
        metadata: { reason: "ip_blocked", ip: clientIp },
      });
      res.status(403).json({
        success: false,
        message: "Access denied. Your IP address has been blocked.",
      });
      return;
    }

    next();
  } catch (err) {
    // If the DB query fails, allow the request through (fail open)
    console.error("[IpAccessMiddleware] Error:", err);
    next();
  }
}
