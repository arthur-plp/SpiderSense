import type { ComponentProps } from "react";
import { cn } from "@/components/ui/cn";

/** Centered page width with the site's responsive gutters. */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}
