import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "node:url"
import { resolveServices, viteProxy } from "./config/serverProxy.mjs"
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const proxy = viteProxy(resolveServices(env))
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: { host: "127.0.0.1", port: 8100, strictPort: true, proxy },
    preview: { host: "127.0.0.1", port: 8100, strictPort: true, proxy },
  }
})
