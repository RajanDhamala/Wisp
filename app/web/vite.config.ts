import { createReadStream, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createRequire } from "node:module";
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

const require = createRequire(import.meta.url);
const sandpackClientEntry = require.resolve("@codesandbox/sandpack-client");
const sandpackRuntimeDirectory = path.resolve(
  path.dirname(sandpackClientEntry),
  "../sandpack",
);
const sandpackPort = 5174;
const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const serveSandpackRuntime = (
  request: IncomingMessage,
  response: ServerResponse,
) => {
  let pathname: string;
  try {
    pathname = decodeURIComponent(
      new URL(request.url || "/", "http://sandpack.local").pathname,
    );
  } catch {
    response.writeHead(400).end("Invalid URL");
    return;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  let filePath = path.resolve(sandpackRuntimeDirectory, relativePath);
  const allowedRoot = `${sandpackRuntimeDirectory}${path.sep}`;
  if (filePath !== sandpackRuntimeDirectory && !filePath.startsWith(allowedRoot)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    if (statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
    if (!statSync(filePath).isFile()) throw new Error("Not a file");
  } catch {
    response.writeHead(404).end("Not found");
    return;
  }

  response.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": filePath.endsWith("index.html")
      ? "no-cache"
      : "public, max-age=31536000, immutable",
    "Content-Type":
      contentTypes[path.extname(filePath).toLowerCase()] ||
      "application/octet-stream",
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  const stream = createReadStream(filePath);
  stream.on("error", () => response.destroy());
  stream.pipe(response);
};

const localSandpackRuntime = (): Plugin => {
  let runtimeServer: ReturnType<typeof createServer> | null = null;

  const startRuntime = () => {
    if (runtimeServer) return;
    runtimeServer = createServer(serveSandpackRuntime);
    runtimeServer.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code !== "EADDRINUSE") {
        console.error("Sandpack runtime failed to start", error);
      }
    });
    runtimeServer.listen(sandpackPort, "0.0.0.0", () => {
      console.log(`Sandpack runtime listening on http://0.0.0.0:${sandpackPort}`);
    });
  };

  const stopRuntime = () => {
    runtimeServer?.close();
    runtimeServer = null;
  };

  return {
    name: "wisp-local-sandpack-runtime",
    configureServer(server) {
      startRuntime();
      server.httpServer?.once("close", stopRuntime);
    },
    configurePreviewServer(server) {
      startRuntime();
      server.httpServer?.once("close", stopRuntime);
    },
  };
};

export default defineConfig({
  plugins: [react(), tailwindcss(), localSandpackRuntime()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
  },
});
