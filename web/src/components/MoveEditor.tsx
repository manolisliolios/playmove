import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useState } from "react";
import MonacoEditor from "@monaco-editor/react";

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
import { CopyIcon } from "@/icons/CopyIcon";
import { CopySidebar } from "./CopySidebar";
import { useGist } from "@/hooks/useGist";
import { useBuildCode, useFormatCode } from "@/hooks/usePlaymoveApi";

const MODULE_NAME_REGEX = /\bmodule\s+([a-zA-Z_][\w]*)::([a-zA-Z_][\w]*)/;

const getModuleName = (code: string) => {
  const match = code.match(MODULE_NAME_REGEX);
  if (match) {
    return match[1];
  }
  return "temp";
};

const importFromUri = () => {
  if (window.location.hash) {
    const code = decodeURIComponent(window.location.hash.slice(1));
    return code;
  }

  return null;
};

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
  code,
  apiUrl = API_URL,
  setCode,
  enableLocalStorageSaving = true,
  localStorageKey = "moveground.code",
}: MoveEditorProps) {
  const containerRef = useRef(null);
  const [useVerticalVersion, setUseVerticalVersion] = useState(false);

  const [tab, setTab] = useState<"code" | "copy">("code");
  const [showOutput, setShowOutput] = useState(false);

  const codeRequest = useMemo(() => {
    const name = getModuleName(code || "");
    return {
      name,
      sources: { [name]: code?.trim() || "" },
      tests: {},
      build_type: "Test" as const,
    };
  }, [code]);

  const { query, hasShareParam } = useGist();

  const { mutateAsync: executeBuild, isPending: isBuilding } = useBuildCode();

  const { mutateAsync: executeFormat, isPending: isFormatting } =
    useFormatCode();

  const loading = useMemo(
    () => isBuilding || isFormatting,
    [isBuilding, isFormatting]
  );

  useEffect(() => {
    if (!hasShareParam) return;
    if (query.isLoading) return;

    setCode?.(query.data);
  }, [query.isLoading, hasShareParam, query.data]);

  useEffect(() => {
    const code = importFromUri();
    if (code) handleEditorChange(code);
  }, []);

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
  }, [output, loading, showOutput]);

  const build = useCallback(
    async (test: boolean = false) => {
      setOutput("");
      setShowOutput(true);
      setTab("code");

      try {
        const result = await executeBuild({
          ...codeRequest,
          build_type: test ? "Test" : "Build",
        });

        setOutput(result.stdout + "\n" + result.stderr);
      } catch (e) {
        console.error(e);
      }
    },
    [codeRequest]
  );

  const formatCode = useCallback(async () => {
    setShowOutput(true);
    setTab("code");

    try {
      const result = await executeFormat(codeRequest);

      handleEditorChange(result);
      setOutput("Code formatted successfully.");
    } catch (e) {
      console.error(e);
      setOutput("Error formatting code.");
    }
  }, [codeRequest]);

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
        tooltip: darkMode ? "Switch to Light Mode" : "Switch to Dark Mode",
        onClick: () => setDarkMode?.(!darkMode),
      },

      {
        icon: <TerminalIcon />,
        tooltip: "Show Terminal",
        onClick: () => {
          if (showOutput && tab === "code") {
            setShowOutput(false);
            return;
          }

          setTab("code");
          setShowOutput(true);
        },
      },
      {
        icon: <CopyIcon />,
        tooltip: "Share Code",
        onClick: () => {
          if (showOutput && tab === "copy") {
            setShowOutput(false);
            return;
          }

          setTab("copy");
          setShowOutput(true);
        },
      },
    ];
  }, [darkMode, formatCode, build, showOutput, tab]);

  const outputActions = useMemo(() => {
    return [
      {
        icon: <CloseIcon />,
        tooltip: "Hide Sidebar",
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
            className={cn("!overflow-y-auto relative")}
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

            <div className="py-12 px-4">
              {tab === "code" && (
                <TerminalOutput
                  output={output || "Run output will be visible here."}
                />
              )}
              {tab === "copy" && (
                <CopySidebar codeRequest={codeRequest} apiUrl={apiUrl} />
              )}
            </div>
          </ResizablePanel>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
