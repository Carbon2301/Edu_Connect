import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'edconnect-secret-key-change-in-production';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'Admin' | 'Teacher' | 'Student';
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
