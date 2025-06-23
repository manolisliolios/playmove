import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useState } from "react";
import MonacoEditor from "@monaco-editor/react";
// import prettier from "prettier/standalone";
// @ts-ignore-next-line
// import * as movePrettierPlugin from "../lib/prettier-move/src/index";

import TerminalOutput from "./TerminalOutput";
import { Loading } from "./ui/loading";
import { COLORS } from "@/lib/colors";
import { PlayIcon } from "@/icons/PlayIcon";
import { API_URL, cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { FormatIcon } from "@/icons/FormatIcon";
import { convertShiki } from "@/lib/shiki-highlighter";
import { DarkMode } from "@/icons/DarkMode";
import { LightMode } from "@/icons/LightMode";
import { CloseIcon } from "@/icons/CloseIcon";
import { TerminalIcon } from "@/icons/TerminalIcon";

export interface MoveEditorProps {
  height?: string;
  width?: string;
  readOnly?: boolean;
  darkMode?: boolean;
  setDarkMode?: (darkMode: boolean) => void;
  code?: string;
  setCode?: (code: string | undefined) => void;
  enableLocalStorageSaving?: boolean;
  localStorageKey?: string;
  apiUrl?: string;
}

export function MoveEditor({
  height = "50vh",
  width = "100%",
  readOnly = false,
  darkMode = false,
  setDarkMode,
  code = `module temp::temp;

  public fun foo(): bool {
      true
  }`,
  apiUrl = API_URL,
  setCode,
  enableLocalStorageSaving = true,
  localStorageKey = "moveground.code",
}: MoveEditorProps) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [useVerticalVersion, setUseVerticalVersion] = useState(false);

  const [showOutput, setShowOutput] = useState(false);

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
    return (output || loading) && showOutput;
  }, [output, loading]);

  const build = useCallback(
    async (test: boolean = false) => {
      setLoading(true);
      setOutput("");
      setShowOutput(true);

      try {
        const res = await fetch(`${apiUrl}/build`, {
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
    },
    [code]
  );

  const formatCode = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/format`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "temp",
          sources: { temp: code?.trim() || "" },
          tests: {},
        }),
      });

      const result = await res.json();

      handleEditorChange(result.sources.temp || "");
      setShowOutput(true);
      setOutput("Code formatted successfully.");
    } catch (e) {
      console.error(e);
      setOutput("Error formatting code.");
    }

    setLoading(false);
  }, [code]);

  const codeActions = useMemo(() => {
    return [
      {
        icon: <PlayIcon />,
        tooltip: "Run tests",
        onClick: () => build(true),
      },
      {
        icon: <FormatIcon />,
        tooltip: "Format Code",
        onClick: formatCode,
      },
      {
        icon: darkMode ? <LightMode /> : <DarkMode />,
        tooltip: "Switch to Light Mode",
        onClick: () => setDarkMode?.(!darkMode),
      },

      {
        icon: <TerminalIcon />,
        tooltip: showOutput ? "Hide Terminal" : "Show Terminal",
        onClick: () => setShowOutput(!showOutput),
      },
    ];
  }, [darkMode, formatCode, build, showOutput]);

  const outputActions = useMemo(() => {
    return [
      {
        icon: <CloseIcon />,
        tooltip: "Hide Terminal",
      },
    ];
  }, []);

  return (
    <div
      ref={containerRef}
      className="move-editor-container monaco-editor relative"
      style={{
        width,
        backgroundColor: `var(--vscode-editor-background)`,
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: `${
          darkMode ? COLORS.dark.border : COLORS.light.border
        }!important`,
        color: `var(--vscode-editor-foreground)`,
      }}
    >
      <ResizablePanelGroup
        direction={useVerticalVersion ? "vertical" : "horizontal"}
      >
        <ResizablePanel
          defaultSize={showOutputPanel && !useVerticalVersion ? 65 : 100}
          className="relative"
          style={{
            minHeight: useVerticalVersion ? "300px" : undefined,
          }}
        >
          <div className="absolute top-[10px] right-[15px] z-50 flex gap-5 flex-col move-editor-actions ">
            {codeActions.map((action) => (
              <Tooltip key={action.tooltip}>
                <TooltipTrigger
                  className={cn(
                    "flex cursor-pointer disabled:opacity-50 px-2 text-xs"
                  )}
                  style={{
                    color: `var(--vscode-editor-foreground)`,
                  }}
                  onClick={action.onClick}
                  disabled={loading}
                >
                  {action.icon}
                </TooltipTrigger>
                <TooltipContent side="left">{action.tooltip}</TooltipContent>
              </Tooltip>
            ))}
          </div>
          <MonacoEditor
            language="move"
            height={height}
            defaultLanguage="move"
            defaultValue={code}
            value={code}
            onChange={handleEditorChange}
            theme={darkMode ? "github-dark-default" : "github-light-default"}
            options={{
              minimap: { enabled: false },
              domReadOnly: readOnly,
              readOnly,
            }}
            beforeMount={async (monaco) => {
              await convertShiki(monaco, darkMode);
            }}
          />
        </ResizablePanel>

        {!useVerticalVersion && showOutput && (
          <ResizableHandle
            className="max-md:hidden"
            withHandle
            darkMode={darkMode}
          />
        )}

        {showOutput && (
          <ResizablePanel
            defaultSize={useVerticalVersion ? 100 : 35}
            className="!overflow-y-auto relative"
            style={{
              height,
              minHeight: useVerticalVersion ? "250px" : undefined,
            }}
          >
            <div className="absolute top-[10px] right-[5px] z-50 flex gap-5 flex-col-reverse output-actions">
              {outputActions.map((action) => (
                <Tooltip key={action.tooltip}>
                  <TooltipTrigger
                    className={cn(
                      "flex cursor-pointer disabled:opacity-50 px-2 text-xs"
                    )}
                    style={{
                      color: `var(--vscode-editor-foreground)`,
                    }}
                    onClick={() => setShowOutput(false)}
                    disabled={loading}
                  >
                    {action.icon}
                  </TooltipTrigger>
                  <TooltipContent>{action.tooltip}</TooltipContent>
                </Tooltip>
              ))}
            </div>
            {loading && <Loading />}
            <TerminalOutput
              output={output || "Run output will be visible here."}
            />
          </ResizablePanel>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
