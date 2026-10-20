import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'light' | 'dark' | 'gold';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  light: 'btn-light',
  dark: 'btn-dark',
  gold: 'btn-gold',
};

/** Base button styled after design/home.html (54px tall, presses down 5px). */
export function Button({
  variant = 'light',
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={`btn ${VARIANT_CLASSES[variant]} ${className ?? ''}`} {...rest}>
      {children}
    </button>
  );
}
