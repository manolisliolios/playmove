import { Loading } from "./ui/loading";
import { CopyIcon } from "@/icons/CopyIcon";
import { TooltipContent } from "./ui/tooltip";
import { Tooltip } from "./ui/tooltip";
import { cn, Code } from "@/lib/utils";
import { TooltipTrigger } from "./ui/tooltip";
import { useState } from "react";
import { CheckIcon } from "@/icons/CheckIcon";
import { toast } from "sonner";
import { useShare } from "@/hooks/useShare";

export function CopySidebar({
  codeRequest,
  apiUrl,
  className,
}: {
  codeRequest: Code;
  apiUrl: string;
  className?: string;
}) {
  const share = useShare({ apiUrl, codeRequest });

  return (
    <div className={cn(className)}>
      <div className="pb-6">
        <p>Create a share-able link to this code.</p>
      </div>

      {!share.submittedAt && (
        <button
          className="border-b cursor-pointer"
          onClick={() => share.mutate(codeRequest)}
        >
          Share Code
        </button>
      )}

      {share.isPending && <Loading className="py-6" />}

      {share.isSuccess && (
        <div className="grid grid-cols-1 gap-2">
          <ShareLink
            href={`${window.location.origin}/?share_id=${share.data.id}`}
            text="Open in Playground"
          />
          <ShareLink href={share.data.url} text="Open in Github" />
        </div>
      )}
    </div>
  );
}

function ShareLink({ href, text }: { href: string; text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center">
      <Tooltip>
        <TooltipTrigger
          className={cn("flex cursor-pointer disabled:opacity-50 px-2 text-xs")}
          style={{
            color: `var(--vscode-editor-foreground)`,
          }}
          onClick={() => {
            navigator.clipboard.writeText(href);
            toast.success("Link copied to clipboard");
            setCopied(true);

            setTimeout(() => {
              setCopied(false);
            }, 2000);
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </TooltipTrigger>
        <TooltipContent side="left">Copy Link</TooltipContent>
      </Tooltip>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="border-b"
      >
        {text}
      </a>
    </div>
  );
}
