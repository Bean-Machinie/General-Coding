import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        // Pop the browser open on `npm run dev`.
        open: true,
        port: 5173,
        // Fail loudly instead of silently sliding to 5174 if the port is busy.
        strictPort: true,
    },
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "./src"),
        },
    },
});
