import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { attachRoom } from "./room.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function inside(file) {
  const resolved = path.resolve(file);
  return resolved === dist || resolved.startsWith(dist + path.sep);
}

function sendFile(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(dist, url === "/" ? "index.html" : url);
  if (!inside(file)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) sendFile(res, path.join(dist, "index.html"));
    else sendFile(res, file);
  });
});

attachRoom(server);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`KREL http://0.0.0.0:${PORT}`);
});
