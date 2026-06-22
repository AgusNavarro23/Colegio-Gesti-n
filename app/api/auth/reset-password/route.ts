import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { hash } from 'bcryptjs';

const resetSchema = z.object({
  email: z.string().email('Email inválido'),
  code: z.string().length(6, 'El código debe tener 6 dígitos'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, password } = resetSchema.parse(body);

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      return NextResponse.json(
        { error: 'Código de recuperación inválido' },
        { status: 400 }
      );
    }

    if (user.resetToken !== code) {
      return NextResponse.json(
        { error: 'Código incorrecto' },
        { status: 400 }
      );
    }

    if (new Date() > user.resetTokenExpiry) {
      return NextResponse.json(
        { error: 'El código ha expirado' },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    await db.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    console.error('Reset password error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al restablecer la contraseña' },
      { status: 500 }
    );
  }
}
