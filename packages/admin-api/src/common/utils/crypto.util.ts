import * as crypto from 'crypto';

export class CryptoUtil {
  /**
   * Generate a random API key
   */
  static generateApiKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a random secret for webhook signing
   */
  static generateWebhookSecret(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash a string using SHA-256
   */
  static sha256Hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Generate HMAC-SHA256 signature
   */
  static generateHmacSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verify HMAC-SHA256 signature
   */
  static verifyHmacSignature(payload: string, secret: string, signature: string): boolean {
    const expectedSignature = CryptoUtil.generateHmacSignature(payload, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Get key prefix for API key identification
   */
  static getKeyPrefix(key: string, length: number = 8): string {
    return key.substring(0, length);
  }
}
