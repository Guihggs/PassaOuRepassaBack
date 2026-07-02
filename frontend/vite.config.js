import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // permite acesso via IP local (celulares na mesma rede)
    port: 5173,
  },
});
