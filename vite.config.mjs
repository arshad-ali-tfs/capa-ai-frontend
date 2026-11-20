import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "node:url"
import { findService, resolveServices, viteProxy } from "./config/serverProxy.mjs"
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const services=resolveServices(env)
  const proxy = viteProxy(services)
  return {
    plugins: [{name:"registered-api-boundary",configureServer(server){server.middlewares.use((request,response,next)=>{
      const pathname=new URL(request.url||"/","http://localhost").pathname
      if(pathname.startsWith("/api/")&&!findService(pathname,services)){response.statusCode=404;response.setHeader("Content-Type","application/json");response.end(JSON.stringify({detail:"Unknown service."}));return}
      next()
    })}},react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: { host: "127.0.0.1", port: 8100, strictPort: true, proxy },
    preview: { host: "127.0.0.1", port: 8100, strictPort: true, proxy },
  }
})
