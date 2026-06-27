import { OTP } from "otplib";
import { crypto } from "@otplib/plugin-crypto-node";
import QRCode from "qrcode";

const ISSUER = "Book E-Commerce";

const totp = new OTP({ crypto });

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
}
