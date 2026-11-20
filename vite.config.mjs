import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "node:url"
import { createApiMiddleware } from "./config/apiProxy.mjs"
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiProxy = createApiMiddleware(env)
  return {
    plugins: [{
      name: "registered-api-boundary",
      configureServer(server) { server.middlewares.use(apiProxy) },
      configurePreviewServer(server) { server.middlewares.use(apiProxy) },
    }, react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: { host: "127.0.0.1", port: 8100, strictPort: true },
    preview: { host: "127.0.0.1", port: 8100, strictPort: true },
  }
})
