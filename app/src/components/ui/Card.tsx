import type { ReactNode } from "react";
import { clsx } from "clsx";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <section className={clsx("rounded-lg border border-border-subtle bg-surface-card", className)}>
      {children}
    </section>
  );
}

