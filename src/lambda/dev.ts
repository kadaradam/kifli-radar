import { forward } from "@ngrok/ngrok";
import "dotenv/config";
import { createServer } from "node:http";
import { webhookCallback } from "grammy";
import bot from "./bot";
import { setupWebhook } from "./setup";

const PORT = 3000;

const server = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/webhook") {
    webhookCallback(bot, "http")(req, res);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

// Start server on port 3000
server.listen(PORT, async () => {
  const listener = await forward({
    addr: PORT,
    authtoken_from_env: true,
  });
  const ngrokUrl = listener.url()!;

  setupWebhook(`${ngrokUrl}/webhook`);

  console.log(`Server running on ${ngrokUrl}`);
});
