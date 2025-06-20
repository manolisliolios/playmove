import { shikiToMonaco } from "@shikijs/monaco";
import { createHighlighter } from "shiki";

export async function convertShiki(monaco: any) {
  monaco.languages.register({ id: "move" });

  const content = await (
    await fetch(
      `https://raw.githubusercontent.com/damirka/move-syntax/refs/heads/main/syntaxes/move.tmLanguage.json`,
    )
  ).text();

  const customGrammar = JSON.parse(content);

  // Create the highlighter, it can be reused
  const highlighter = await createHighlighter({
    themes: ["github-light", "github-dark"],
    langs: [
      {
        name: "move",
        ...customGrammar,
      },
    ],
  });

  shikiToMonaco(highlighter, monaco);
}
