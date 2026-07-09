import type { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

export function Button({
  children,
  className,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex h-11 items-center justify-center gap-2 rounded px-4 text-sm font-bold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-primary text-white shadow-soft hover:bg-primary-action",
        variant === "secondary" &&
          "border border-primary-action bg-white text-primary hover:bg-primary-soft",
        variant === "ghost" && "text-secondary hover:bg-surface-container-low hover:text-text-heading",
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

