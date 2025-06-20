import Ansi from "ansi-to-react";

const TerminalOutput = ({
  output,
  className,
}: {
  output: string;
  className?: string;
}) => {
  return (
    <pre
      className={`whitespace-pre-wrap p-2 text-sm ${className}`}
      style={{
        fontFamily: "monospace",
      }}
    >
      <Ansi>{output}</Ansi>
    </pre>
  );
};

export default TerminalOutput;
