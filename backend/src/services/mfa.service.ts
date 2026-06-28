import { OTP } from "otplib";
import { crypto as otplibCrypto } from "@otplib/plugin-crypto-node";
import QRCode from "qrcode";

import bcrypt from "bcryptjs";
import nodeCrypto from "node:crypto";
import prisma from "../lib/prisma";

const ISSUER = "Book E-Commerce";
const BACKUP_CODE_COUNT = 10;

const totp = new OTP({ crypto: otplibCrypto });

export class MfaService {
  generateSecret(): string {
    return totp.generateSecret();
  }

  getProvisioningUri(secret: string, email: string): string {
    return totp.generateURI({ issuer: ISSUER, label: email, secret });
  }

  async generateQrCodeDataUri(provisioningUri: string): Promise<string> {
    return QRCode.toDataURL(provisioningUri);
  }

  verifyCode(secret: string, token: string): boolean {
    try {
      return Boolean(totp.verifySync({ token, secret }));
    } catch {
      return false;
    }
  }

  isBackupCode(code: string): boolean {
    return /^[0-9a-f]{10}$/i.test(code);
  }

  /**
   * Generate BACKUP_CODE_COUNT (10) one-time backup codes.
   * Each code is a 10-character hex string.
   * Codes are hashed with bcrypt before storage.
   * Returns the raw codes so the user can save them.
   */
  async generateBackupCodes(userId: string): Promise<string[]> {
    // Delete any existing unused backup codes for this user
    await prisma.backupCode.deleteMany({
      where: { userId, usedAt: null },
    });

    const rawCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const raw = nodeCrypto.randomBytes(5).toString("hex"); // 10 hex chars
      const hashed = await bcrypt.hash(raw, 10);
      rawCodes.push(raw);
      hashedCodes.push(hashed);
    }

    await prisma.backupCode.createMany({
      data: hashedCodes.map((code) => ({
        userId,
        code,
      })),
    });

    return rawCodes;
  }

  /**
   * Verify a backup code against stored (hashed) codes.
   * Marks the matched code as used.
   * Codes are normalized to lowercase for case-insensitive matching.
   */
  async verifyAndConsumeBackupCode(userId: string, rawCode: string): Promise<boolean> {
    const normalizedCode = rawCode.toLowerCase();

    const storedCodes = await prisma.backupCode.findMany({
      where: { userId, usedAt: null },
      select: { id: true, code: true },
    });

    for (const stored of storedCodes) {
      const isValid = await bcrypt.compare(normalizedCode, stored.code);
      if (isValid) {
        await prisma.backupCode.update({
          where: { id: stored.id },
          data: { usedAt: new Date() },
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Get number of remaining unused backup codes for a user.
   */
  async getRemainingBackupCodes(userId: string): Promise<number> {
    return prisma.backupCode.count({
      where: { userId, usedAt: null },
    });
  }
}
