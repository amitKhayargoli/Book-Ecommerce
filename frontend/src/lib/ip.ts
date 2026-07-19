/**
 * Strips the IPv4-mapped IPv6 prefix (::ffff:) from an IP address.
 * This notation appears when requests arrive through Docker or certain proxies.
 * Example: "::ffff:192.168.1.5" → "192.168.1.5"
 */
export function cleanIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return ip.replace(/^::ffff:/i, "");
}
