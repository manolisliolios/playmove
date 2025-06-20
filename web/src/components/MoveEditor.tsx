import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useEffect, useMemo, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useState } from "react";
import MonacoEditor from "@monaco-editor/react";

import TerminalOutput from "./TerminalOutput";
import { Loading } from "./ui/loading";
import { COLORS } from "@/lib/colors";
import { PlayIcon } from "@/icons/PlayIcon";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { FormatIcon } from "@/icons/FormatIcon";
import { convertShiki } from "@/lib/shiki-highlighter";

export function MoveEditor({
  height = "50vh",
  width = "100%",
  readOnly = false,
  darkMode = true,
  code = `module temp::temp;

  public fun foo(): bool {
      true
  }`,
  setCode,
  enableLocalStorageSaving = true,
  localStorageKey = "moveground.code",
}: {
  height?: string;
  width?: string;
  readOnly?: boolean;
  darkMode?: boolean;
  code?: string;
  setCode?: (code: string | undefined) => void;
  enableLocalStorageSaving?: boolean;
  localStorageKey?: string;
}) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [useVerticalVersion, setUseVerticalVersion] = useState(false);

  // Track the container's width so we can adjust how the layout of the
  // editor is being displayed!
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        if (width < 600) {
          setUseVerticalVersion(true);
        } else {
          setUseVerticalVersion(false);
        }
      }
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const [output, setOutput] = useState<string | undefined>(undefined);

  const debouncedCode = useDebounce(code, 1000);

  useEffect(() => {
    if (!enableLocalStorageSaving) return;

    if (!debouncedCode) {
      localStorage.removeItem(localStorageKey);
      return;
    }
    localStorage.setItem(localStorageKey, debouncedCode);
  }, [debouncedCode, enableLocalStorageSaving, localStorageKey]);

  const handleEditorChange = (value: string | undefined) => {
    setCode?.(value);
  };

  const showOutputPanel = useMemo(() => {
    return output || loading;
  }, [output, loading]);

  const build = async (test: boolean = false) => {
    setLoading(true);
    setOutput("");
    try {
      const res = await fetch("http://localhost:8181/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "temp",
          sources: { temp: code?.trim() || "" },
          tests: {},
          build_type: test ? "Test" : "Build",
        }),
      });
      const result = await res.json();
      setOutput(result.stdout + "\n" + result.stderr);
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  };

  return (
    <div
      ref={containerRef}
      className="border move-editor-container relative"
      style={{
        width,
        backgroundColor: darkMode
          ? COLORS.dark.background
          : COLORS.light.background,
      }}
    >
      <ResizablePanelGroup
        direction={useVerticalVersion ? "vertical" : "horizontal"}
      >
        <ResizablePanel
          defaultSize={showOutputPanel && !useVerticalVersion ? 65 : 100}
          style={{
            minHeight: useVerticalVersion ? "300px" : undefined,
          }}
        >
          <MonacoEditor
            language="move"
            height={height}
            defaultLanguage="move"
            defaultValue={code}
            onChange={handleEditorChange}
            theme={darkMode ? "github-dark" : "github-light"}
            options={{
              minimap: { enabled: false },
              domReadOnly: readOnly,
              readOnly,
            }}
            beforeMount={async (monaco) => {
              await convertShiki(monaco);
            }}
          />
        </ResizablePanel>

        {!useVerticalVersion && (
          <ResizableHandle className="max-md:hidden" withHandle />
        )}
        <ResizablePanel
          defaultSize={useVerticalVersion ? 100 : 35}
          className="!overflow-y-auto"
          style={{
            height,
            minHeight: useVerticalVersion ? "250px" : undefined,
            borderTop: useVerticalVersion ? "1px solid" : undefined,
            borderColor: darkMode ? COLORS.dark.border : COLORS.light.border,
          }}
        >
          <div className="flex items-center justify-end py-2 border-b">
            <Tooltip>
              <TooltipTrigger
                className={cn(
                  "flex cursor-pointer disabled:opacity-50 px-2",
                  darkMode && "text-white",
                  !darkMode && "text-black",
                )}
                onClick={() => build(true)}
                disabled={loading}
              >
                <FormatIcon />
              </TooltipTrigger>
              <TooltipContent>
                <p>Format Code</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                className={cn(
                  "flex cursor-pointer disabled:opacity-50 px-2",
                  darkMode && "text-white",
                  !darkMode && "text-black",
                )}
                onClick={() => build(true)}
                disabled={loading}
              >
                <PlayIcon />
              </TooltipTrigger>
              <TooltipContent>
                <p>Run tests</p>
              </TooltipContent>
            </Tooltip>
          </div>
          {loading && <Loading darkMode={darkMode} />}
          {output && <TerminalOutput output={output} darkMode={darkMode} />}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
