import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// The encryption key should be stored in environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required')
}

// Convert the base64 key to Buffer
const key = Buffer.from(ENCRYPTION_KEY, 'base64')

export async function encrypt(text: string): Promise<{ encrypted: string; iv: string }> {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  
  const authTag = cipher.getAuthTag()
  
  return {
    encrypted: encrypted + '.' + authTag.toString('base64'),
    iv: iv.toString('base64')
  }
}

export async function decrypt(encryptedText: string, ivString: string): Promise<string> {
  const [encrypted, authTag] = encryptedText.split('.')
  const iv = Buffer.from(ivString, 'base64')
  
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(Buffer.from(authTag, 'base64'))
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}