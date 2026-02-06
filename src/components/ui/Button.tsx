"use client";

import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 active:bg-[var(--color-primary)]/30",
  secondary:
    "bg-[var(--color-surface-hover)] border-[var(--color-surface-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-border)]/50 hover:text-[var(--color-text-secondary)] active:bg-[var(--color-surface-border)]",
  danger:
    "bg-red-50 border-red-600 text-red-600 hover:bg-red-100 active:bg-red-200",
  ghost:
    "bg-transparent border-transparent text-[var(--color-text-secondary)] hover:bg-black/5 active:bg-black/10",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={`
          border rounded-md font-medium cursor-pointer
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
