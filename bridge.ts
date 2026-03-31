import { spawn } from "child_process";
import WebSocket, { WebSocketServer } from "ws";

const PORT = 3000;

// Запускаем MCP (stdio)
const mcp = spawn("node", ["dist/index.js"], {
  stdio: ["pipe", "pipe", "pipe"],
});

mcp.stderr.on("data", (data: Buffer) => {
  console.error("MCP ERR:", data.toString());
});

// WebSocket сервер
const wss = new WebSocketServer({ port: PORT });

console.log(`Bridge WS running on port ${PORT}`);

wss.on("connection", (ws: WebSocket) => {
  console.log("Client connected");

  // 👉 буфер для stdout (важно!)
  let buffer = "";

  // MCP → WS
  mcp.stdout.on("data", (data: Buffer) => {
    buffer += data.toString();

    // MCP обычно шлёт JSON строками с \n
    let parts = buffer.split("\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      if (part.trim()) {
        ws.send(part);
      }
    }
  });

  // WS → MCP
  ws.on("message", (msg: WebSocket.RawData) => {
    const str = msg.toString();
    mcp.stdin.write(str + "\n");
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("error", (err) => {
    console.error("WS error:", err);
  });
});

mcp.on("exit", (code) => {
  console.error("MCP exited with code", code);
});