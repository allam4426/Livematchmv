import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
    dedupe: ["react", "react-dom"],
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify("https://f7080111-5f9c-4a91-8177-216330c4340e-00-2p99b3y7q053z.sisko.replit.dev")
  }
});