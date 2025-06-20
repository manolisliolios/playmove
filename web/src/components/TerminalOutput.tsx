import { COLORS } from "@/lib/colors";
import Ansi from "ansi-to-react";

const TerminalOutput = ({
  output,
  className,
  darkMode,
}: {
  output: string;
  className?: string;
  darkMode?: boolean;
}) => {
  return (
    <pre
      className={`whitespace-pre-wrap p-2 text-sm ${className}`}
      style={{
        backgroundColor: darkMode
          ? COLORS.dark.background
          : COLORS.light.background,
        color: darkMode ? "white" : "black",
        fontFamily: "monospace",
      }}
    >
      <Ansi>{output}</Ansi>
    </pre>
  );
};

export default TerminalOutput;
