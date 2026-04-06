import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { spawn } from "child_process";

const app = express();
const server = createServer(app);

// WebSocket сервер (лучше чем SSE для MCP)
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
    console.log("Client connected");

    const mcp = spawn("node", ["dist/index.js"], {
        stdio: ["pipe", "pipe", "pipe"]
    });

    // 👉 MCP → клиент
    mcp.stdout.on("data", (data) => {
        ws.send(data.toString());
    });

    // 👉 клиент → MCP
    ws.on("message", (message) => {
        mcp.stdin.write(message.toString() + "\n");
    });

    ws.on("close", () => {
        console.log("Client disconnected");
        mcp.kill();
    });

    mcp.stderr.on("data", (data) => {
        console.error("MCP error:", data.toString());
    });

    mcp.on("close", () => {
        ws.close();
    });
});

server.listen(8000, () => {
    console.log("✅ MCP WebSocket proxy running on 8000");
});