'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Adaptamos el componente para usar clases de Bootstrap 'form-check-input'
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'form-check-input d-inline-flex align-items-center justify-content-center p-0',
      'border border-secondary rounded-1',
      // Ajuste manual para compatibilidad visual con Radix
      'position-relative bg-white', 
      className
    )}
    style={{ width: '1.25em', height: '1.25em', cursor: 'pointer' }}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn('d-flex align-items-center justify-content-center text-primary w-100 h-100')}
    >
      <Check className="w-75 h-75" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };