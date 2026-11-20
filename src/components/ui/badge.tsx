import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ComponentProps } from "react";

const badgeVariants = cva("inline-flex w-fit items-center gap-1.5 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-300");

export function Badge({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="badge" className={twMerge(clsx(badgeVariants(), className))} {...props} />;
}
