import crypto from "crypto";
import type { Request } from "express";

export const BROWSER_UA_RE =
  /(?:mozilla|chrome|safari|firefox|edg\/|opera|applewebkit|samsungbrowser|samsung|ucweb|ucbrowser)/i;

export function asSingleHeader(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    return value.length > 0 && typeof value[0] === "string"
      ? value[0]
      : undefined;
  }
  return typeof value === "string" ? value : undefined;
}

export function isBrowserUA(value: unknown): boolean {
  const ua = asSingleHeader(value);
  return !!ua && BROWSER_UA_RE.test(ua);
}

export function userAgentHash(req: Request): string | undefined {
  if (!isBrowserUA(req.headers["user-agent"])) return undefined;
  const ua = asSingleHeader(req.headers["user-agent"])!;
  return crypto.createHash("sha256").update(ua).digest("hex");
}
