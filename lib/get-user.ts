import { NextRequest } from 'next/server';
import { verifyToken, JWTPayload } from '@/lib/jwt';

export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
