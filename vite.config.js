import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { krelRoom } from "./server/room.js";

export default defineConfig({
  plugins: [react(), tailwindcss(), krelRoom()],
  server: { port: 8080, strictPort: true, host: true },
  preview: { port: 8080, strictPort: true, host: true }
});
