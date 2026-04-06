import express from "express";
import { spawn } from "child_process";
import readline from "readline";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(express.json());

// 🔥 запускаем MCP
const mcp = spawn("node", ["./dist/index.js"]);

// читаем stdout построчно
const rl = readline.createInterface({
  input: mcp.stdout,
  crlfDelay: Infinity,
});

// хранилище pending запросов
const pending = new Map();

// обработка ответов MCP
rl.on("line", (line) => {
  try {
    const msg = JSON.parse(line);

    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id).json(msg);
      pending.delete(msg.id);
    }
  } catch (e) {
    console.error("Bad JSON:", line);
  }
});

// endpoint
app.post("/mcp", (req, res) => {
  const id = uuidv4();

  const payload = {
    jsonrpc: "2.0",
    id,
    ...req.body,
  };

  // сохраняем callback
  pending.set(id, res);

  // отправляем в MCP
  mcp.stdin.write(JSON.stringify(payload) + "\n");

  // таймаут
  setTimeout(() => {
    if (pending.has(id)) {
      pending.get(id).status(504).send("Timeout");
      pending.delete(id);
    }
  }, 10000);
});

app.listen(3000, () => {
  console.log("Bridge running on :3000");
});