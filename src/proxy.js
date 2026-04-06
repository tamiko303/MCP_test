import express from "express";
import { spawn } from "child_process";

const app = express();
app.use(express.json());

app.get("/sse", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    console.log("Client connected");

    const mcp = spawn("node", ["dist/index.js"], {
        stdio: ["pipe", "pipe", "pipe"]
    });

    // 👉 отправляем init (КРИТИЧНО)
    const initMessage = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {}
    };

    mcp.stdin.write(JSON.stringify(initMessage) + "\n");

    mcp.stdout.on("data", (data) => {
        const text = data.toString();
        console.log("MCP:", text);

        res.write(`data: ${text}\n\n`);
    });

    mcp.stderr.on("data", (data) => {
        console.error("MCP error:", data.toString());
    });

    mcp.on("close", (code) => {
        console.log("MCP exited:", code);
        res.end();
    });

    req.on("close", () => {
        console.log("Client disconnected");
        mcp.kill();
    });
});

app.listen(8000, () => {
    console.log("✅ MCP Proxy running on port 8000");
});