import { cn } from "@/lib/utils";

export function Loading({
  className,
  darkMode,
}: {
  className?: string;
  darkMode?: boolean;
}) {
  const colorClass = darkMode ? "bg-white" : "bg-black";
  return (
    <div
      className={cn(
        " h-full gap-1 flex items-center justify-center",
        className,
      )}
    >
      <span className="sr-only">Loading...</span>
      <div
        className={cn(
          "h-3 w-3 rounded-full animate-bounce [animation-delay:-0.3s]",
          colorClass,
        )}
      ></div>
      <div
        className={cn(
          "h-3 w-3 rounded-full animate-bounce [animation-delay:-0.15s]",
          colorClass,
        )}
      ></div>
      <div
        className={cn("h-3 w-3 rounded-full animate-bounce", colorClass)}
      ></div>
    </div>
  );
}
