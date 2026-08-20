import { type ButtonHTMLAttributes, forwardRef } from "react";
import Link from "next/link";

const VARIANTS = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600",
  secondary: "bg-white text-[var(--foreground)] border border-border hover:bg-surface-muted focus-visible:outline-brand-600",
  ghost: "text-brand-700 hover:bg-brand-50 focus-visible:outline-brand-600",
  danger: "bg-danger-500 text-white hover:bg-danger-700 focus-visible:outline-danger-500",
} as const;

const SIZES = {
  sm: "text-sm px-2.5 py-1.5 gap-1.5",
  md: "text-sm px-3.5 py-2 gap-2",
  lg: "text-base px-4 py-2.5 gap-2",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}

const base =
  "inline-flex items-center justify-center rounded-[var(--radius-sm)] font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = "", variant = "primary", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
});

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}>
      {children}
    </Link>
  );
}
