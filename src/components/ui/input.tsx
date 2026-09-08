import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-11 w-full rounded-lg border border-white/10 bg-white/4 px-3.5 py-2 text-sm text-zinc-100 transition placeholder:text-zinc-600 focus-visible:border-amber-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
