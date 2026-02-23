import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  name: z.string().min(1, 'El nombre es requerido'),
  role: z.enum(['ADMIN', 'EMPLOYEE', 'CLIENT']).default('CLIENT'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role } = registerSchema.parse(body);

    // Verificar si el email ya existe
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      );
    }

    // Hash de la contraseña
    const hashedPassword = await hash(password, 10);

    // Crear usuario
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });

    // Crear token
    const token = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
      })
    ).toString('base64');

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al registrar usuario' },
      { status: 500 }
    );
  }
}
