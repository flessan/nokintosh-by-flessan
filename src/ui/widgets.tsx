import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

export function Button({
  className,
  variant = "normal",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "normal" | "default" }) {
  return (
    <button
      type="button"
      {...rest}
      className={cn("ui-btn", variant === "default" && "ui-btn-default", className)}
    />
  );
}

/** Classic grouped frame with an inset etched border and a caption. */
export function GroupBox({
  label,
  children,
  className,
  bodyClassName,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("px-2 pt-2 pb-2", className)}>
      <h2 className="mb-1 px-[2px] text-[11px] font-bold tracking-wide text-[color:var(--ink)] uppercase">
        {label}
      </h2>
      <div className={cn("bevel-thin-in bg-[color:var(--face)] p-[3px]", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

export function Separator() {
  return <div className="my-1 h-[2px] bevel-thin-in" />;
}

export function Field({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("bevel-sunken px-2 py-1", className)}>{children}</div>;
}
