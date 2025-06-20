import { shikiToMonaco } from "@shikijs/monaco";
import { bundledThemes, createHighlighter } from "shiki";

export async function convertShiki(monaco: any) {
  monaco.languages.register({ id: "move" });

  console.log(bundledThemes);

  const content = await (
    await fetch(
      `https://raw.githubusercontent.com/damirka/move-syntax/refs/heads/main/syntaxes/move.tmLanguage.json`,
    )
  ).text();

  const customGrammar = JSON.parse(content);

  // Create the highlighter, it can be reused
  const highlighter = await createHighlighter({
    themes: ["github-dark-default", "github-light-default"],
    langs: [
      {
        name: "move",
        ...customGrammar,
      },
    ],
  });

  shikiToMonaco(highlighter, monaco);
}
