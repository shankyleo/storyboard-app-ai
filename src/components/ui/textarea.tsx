import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[120px] w-full rounded-lg border border-white/10 bg-white/4 px-3.5 py-3 text-sm leading-relaxed text-zinc-100 transition placeholder:text-zinc-600 focus-visible:border-amber-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
