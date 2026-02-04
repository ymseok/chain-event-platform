import * as crypto from 'crypto';

export class CryptoUtil {
  static generateHmacSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  static verifyHmacSignature(
    payload: string,
    secret: string,
    signature: string,
  ): boolean {
    const expectedSignature = CryptoUtil.generateHmacSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }
}
