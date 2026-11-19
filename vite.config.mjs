import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "node:url"
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const target = env.MAP_API_TARGET || "http://127.0.0.1:8101"
  const proxy = {
    "^/map/dataset(?:\\?.*)?$": { target, changeOrigin: true },
    "/api/v1/map": { target, changeOrigin: true },
  }
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: { host: "127.0.0.1", port: 8100, strictPort: true, proxy },
    preview: { host: "127.0.0.1", port: 8100, strictPort: true, proxy },
  }
})
