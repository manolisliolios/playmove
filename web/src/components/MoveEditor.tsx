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
}: {
  height?: string;
  width?: string;
  readOnly?: boolean;
  darkMode?: boolean;
  code?: string;
  setCode?: (code: string | undefined) => void;
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

  // const [code, setCode] = useState<string | undefined>(initialCode);

  const [output, setOutput] = useState<string | undefined>(undefined);

  const debouncedCode = useDebounce(code, 1000);

  useEffect(() => {
    if (!debouncedCode) {
      localStorage.removeItem("code");
      return;
    }
    localStorage.setItem("code", debouncedCode);
  }, [debouncedCode]);

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
      style={{ width }}
    >
      <ResizablePanelGroup
        direction={useVerticalVersion ? "vertical" : "horizontal"}
      >
        <button
          className={cn(
            "cursor-pointer disabled:opacity-50 absolute top-0 right-0 z-10",
            darkMode && "text-black bg-white",
            !darkMode && "text-black",
          )}
          style={{ padding: "1rem", fontSize: "1rem" }}
          onClick={() => build(true)}
          disabled={loading}
        >
          <PlayIcon />
        </button>
        <ResizablePanel
          defaultSize={showOutputPanel && !useVerticalVersion ? 75 : 100}
          style={{
            minHeight: useVerticalVersion ? height : undefined,
          }}
        >
          <MonacoEditor
            height={height}
            defaultLanguage="move"
            defaultValue={code}
            onChange={handleEditorChange}
            theme={darkMode ? "vs-dark" : "light"}
            options={{
              minimap: { enabled: false },
              domReadOnly: readOnly,
              readOnly,
            }}
          />
        </ResizablePanel>
        {showOutputPanel && (
          <>
            {!useVerticalVersion && (
              <ResizableHandle className="max-md:hidden" withHandle />
            )}
            <ResizablePanel
              defaultSize={useVerticalVersion ? 100 : 25}
              style={{
                height,
                backgroundColor: darkMode
                  ? COLORS.dark.background
                  : COLORS.light.background,
                minHeight: useVerticalVersion ? height : undefined,
                borderTop: useVerticalVersion ? "1px solid" : undefined,
                borderColor: darkMode
                  ? COLORS.dark.border
                  : COLORS.light.border,
              }}
            >
              {loading && <Loading darkMode={darkMode} />}
              {output && <TerminalOutput output={output} darkMode={darkMode} />}
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
