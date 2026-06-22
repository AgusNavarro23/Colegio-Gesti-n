import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from '@/lib/jwt';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export function withAuth(handler: (request: NextRequest, user: JWTPayload) => Promise<NextResponse>) {
  return async function (request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado. Token requerido.' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Token invalido o expirado.' },
        { status: 401 }
      );
    }

    return handler(request, user);
  };
}

export function withRole(allowedRoles: string[]) {
  return function (handler: (request: NextRequest, user: JWTPayload) => Promise<NextResponse>) {
    return async function (request: NextRequest) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (!token) {
        return NextResponse.json(
          { error: 'No autenticado. Token requerido.' },
          { status: 401 }
        );
      }

      const user = verifyToken(token);
      if (!user) {
        return NextResponse.json(
          { error: 'Token invalido o expirado.' },
          { status: 401 }
        );
      }

      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json(
          { error: 'No autorizado. Rol insuficiente.' },
          { status: 403 }
        );
      }

      return handler(request, user);
    };
  };
}
