import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

import styles from './Button.module.scss';

type Variant = 'primary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'ghost',
  size = 'md',
  block = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        styles.btn,
        styles[variant],
        styles[size],
        block && styles.block,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
