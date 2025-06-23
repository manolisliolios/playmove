import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const API_URL = import.meta.env.VITE_MOVE_PLAYGROUND_API_URL || "https://api.playmove.dev";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
