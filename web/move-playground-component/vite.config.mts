import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    lib: {
      entry: path.resolve("src", "components/MoveEditor.tsx"),
      name: "move-playground",
      fileName: (format) => `move-playground.${format}.js`,
    },
    rollupOptions: {
      external: ["react", "react-dom", "shiki"],
      output: {
        globals: {
          react: "React",
        },
      },
    },
  },
});
