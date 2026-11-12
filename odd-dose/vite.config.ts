import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// base "./" so the built game runs from any folder (static hosting, itch.io, artifact).
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: { include: ["tests/**/*.test.{ts,tsx}"] },
});
