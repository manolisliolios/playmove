import { cn } from "@/lib/utils";

export function Loading({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        " h-full gap-1 flex items-center justify-center",
        className,
      )}
    >
      <span className="sr-only">Loading...</span>
      <div
        className="h-3 w-3 rounded-full animate-bounce [animation-delay:-0.3s]"
        style={{
          backgroundColor: `var(--vscode-editor-foreground)`,
        }}
      ></div>
      <div
        className="h-3 w-3 rounded-full animate-bounce [animation-delay:-0.15s]"
        style={{
          backgroundColor: `var(--vscode-editor-foreground)`,
        }}
      ></div>
      <div
        className="h-3 w-3 rounded-full animate-bounce"
        style={{
          backgroundColor: `var(--vscode-editor-foreground)`,
        }}
      ></div>
    </div>
  );
}
