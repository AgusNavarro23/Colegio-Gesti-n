import { NextRequest, NextResponse } from 'next/server';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  exp?: number;
}

function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as JWTPayload;

    if (parsed.exp && Date.now() >= parsed.exp * 1000) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function denyToHome(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/';
  url.search = '';
  return NextResponse.redirect(url);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith('/admin');
  const isEmployeeRoute = pathname.startsWith('/employee');

  if (!isAdminRoute && !isEmployeeRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return denyToHome(request);
  }

  const payload = decodeJWT(token);

  if (!payload?.role) {
    return denyToHome(request);
  }

  if (isAdminRoute && payload.role !== 'ADMIN') {
    return denyToHome(request);
  }

  if (isEmployeeRoute && payload.role !== 'EMPLOYEE') {
    return denyToHome(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/employee/:path*'],
};
