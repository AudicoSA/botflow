import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * Encryption Service
 *
 * Provides AES-256-GCM encryption/decryption for sensitive data like integration credentials.
 * Uses JWT_SECRET as the base for key derivation.
 */
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;

  constructor() {
    // Derive 32-byte key from JWT_SECRET using scrypt
    this.key = crypto.scryptSync(env.JWT_SECRET, 'botflow-salt-2026', 32);
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param data - Object to encrypt
   * @returns Encrypted string containing IV, encrypted data, and auth tag
   */
  encrypt(data: Record<string, any>): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    const text = JSON.stringify(data);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = (cipher as any).getAuthTag();

    return JSON.stringify({
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex'),
      version: 1, // For future key rotation
    });
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param encryptedData - Encrypted string from encrypt()
   * @returns Decrypted object
   */
  decrypt(encryptedData: string): Record<string, any> {
    try {
      const { iv, encrypted, authTag, version = 1 } = JSON.parse(encryptedData);

      // Future: Handle different versions for key rotation
      if (version !== 1) {
        throw new Error(`Unsupported encryption version: ${version}`);
      }

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(iv, 'hex')
      );

      (decipher as any).setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if data is encrypted
   * @param data - String to check
   * @returns True if data appears to be encrypted
   */
  isEncrypted(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      return parsed.iv && parsed.encrypted && parsed.authTag;
    } catch {
      return false;
    }
  }

  /**
   * Safely decrypt data that might not be encrypted
   * @param data - String that may or may not be encrypted
   * @returns Decrypted object or original parsed JSON
   */
  safeDecrypt(data: string): Record<string, any> {
    if (this.isEncrypted(data)) {
      return this.decrypt(data);
    }
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();
