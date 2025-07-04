import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const API_URL =
  import.meta.env.VITE_MOVE_PLAYGROUND_API_URL || "https://api.playmove.dev";

export type Code = {
  name: string;
  sources: { [key: string]: string };
  tests: { [key: string]: string };
  build_type?: "Test" | "Build";
};

export const CacheKeys = {
  build: (codeRequest: Code) => `build::${JSON.stringify(codeRequest)}`,
  format: (codeRequest: Code) => `format::${JSON.stringify(codeRequest)}`,
  share: (codeRequest: Code) => `share::${JSON.stringify(codeRequest)}`,
};

export const PlaygroundApiCache = new Map<string, any>();

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
