import { cn } from "@web/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--zyllen-border)]", className)}
      {...props}
    />
  );
}

export { Skeleton };
