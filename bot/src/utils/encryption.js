const crypto = require('crypto');

class Encryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.saltLength = 64;
    this.tagLength = 16;
    this.key = this.deriveKey(process.env.ENCRYPTION_KEY || 'default-key-change-in-production');
  }

  deriveKey(password) {
    return crypto.scryptSync(password, 'salt', this.keyLength);
  }

  encrypt(text) {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData) {
    try {
      const { encrypted, iv, tag } = encryptedData;
      
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      return null;
    }
  }

  encryptString(text) {
    const result = this.encrypt(text);
    return `${result.iv}:${result.tag}:${result.encrypted}`;
  }

  decryptString(encryptedString) {
    try {
      const [iv, tag, encrypted] = encryptedString.split(':');
      return this.decrypt({ encrypted, iv, tag });
    } catch (error) {
      return null;
    }
  }

  hash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  compare(text, hash) {
    return this.hash(text) === hash;
  }

  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  generateSecureCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars[crypto.randomInt(0, chars.length)];
    }
    return code;
  }
}

module.exports = new Encryption();
