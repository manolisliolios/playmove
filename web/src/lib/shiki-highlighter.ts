import { shikiToMonaco } from "@shikijs/monaco";
import { createHighlighter } from "shiki";

export async function convertShiki(monaco: any, darkMode: boolean) {
  monaco.languages.register({ id: "move" });

  const content = await (
    await fetch(
      `https://raw.githubusercontent.com/damirka/move-syntax/refs/heads/main/syntaxes/move.tmLanguage.json`,
    )
  ).text();

  const customGrammar = JSON.parse(content);

  // Create the highlighter, it can be reused
  const highlighter = await createHighlighter({
    themes: darkMode
      ? ["github-dark-default", "github-light-default"]
      : ["github-light-default", "github-dark-default"],
    langs: [
      {
        name: "move",
        ...customGrammar,
      },
    ],
  });

  shikiToMonaco(highlighter, monaco);
}
