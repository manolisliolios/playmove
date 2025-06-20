import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useEffect, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import TerminalOutput from "./TerminalOutput";
import { Loading } from "./ui/loading";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { COLORS } from "@/lib/colors";

export function MoveEditor({
  height = "50vh",
  readOnly = false,
  darkMode = true,
}: {
  height?: string;
  readOnly?: boolean;
  darkMode?: boolean;
}) {
  const [loading, setLoading] = useState<boolean>(false);

  const isMobile = useMediaQuery("(max-width: 768px)");

  const [code, setCode] = useState<string | undefined>(
    localStorage.getItem("code") ||
      `module temp::temp;
  
  public fun foo(): bool {
      true
  }`,
  );

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
    setCode(value);
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
    <div className="border move-editor-container">
      <div className="flex items-center justify-between border-b-2">
        <div className="text-2xl font-bold shrink-0">Move Editor</div>
        <div className="ml-auto">
          <button
            className="bg-gray-500 text-white cursor-pointer disabled:opacity-50"
            style={{ padding: "1rem", fontSize: "1rem" }}
            onClick={() => build(true)}
            disabled={loading}
          >
            Test
          </button>
        </div>
      </div>

      {isMobile ? "mobile" : ""}
      <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"}>
        <ResizablePanel defaultSize={showOutputPanel && !isMobile ? 75 : 100}>
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
            <ResizableHandle className="max-md:hidden" withHandle />
            <ResizablePanel
              defaultSize={isMobile ? 100 : 25}
              className="!overflow-y-auto"
              style={{
                height,
                backgroundColor: darkMode
                  ? COLORS.dark.background
                  : COLORS.light.background,
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
