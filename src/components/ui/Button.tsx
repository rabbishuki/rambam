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
    "bg-blue-50 border-blue-600 text-blue-600 hover:bg-blue-100 active:bg-blue-200",
  secondary:
    "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-500 active:bg-gray-200",
  danger:
    "bg-red-50 border-red-600 text-red-600 hover:bg-red-100 active:bg-red-200",
  ghost:
    "bg-transparent border-transparent text-gray-500 hover:bg-black/5 active:bg-black/10",
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
