import { Resource } from "sst";
import { setupWebhook } from "../lambda/setup";

const appUrl = Resource.TelegramBotWebhook.url;

// Find the --url argument and get the next value
const args = process.argv.slice(2);
const argsUrl = args[0];

if (!argsUrl && !appUrl) {
  console.error("Please provide an url");
  process.exit(1);
}

const url = argsUrl || appUrl;

// Validate url
if (!url || !url.startsWith("https://")) {
  console.error("Please provide a valid url");
  process.exit(1);
}

setupWebhook(url);
