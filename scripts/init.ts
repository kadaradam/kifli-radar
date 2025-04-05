import chalk from "chalk";
import { Resource } from "sst";
import { setupWebhook } from "~/lambda/setup";

const appUrl = Resource.TelegramBotWebhook.url;

// Find the --url argument and get the next value
const args = process.argv.slice(2);
const argsUrl = args[0];

if (!argsUrl && !appUrl) {
  console.error("Please provide an url");
  process.exit(1);
}

// Validate url
if (!argsUrl || !argsUrl.startsWith("https://")) {
  console.error("Please provide a valid url");
  process.exit(1);
}

const url = argsUrl || appUrl;

setupWebhook(url);

console.log(`
  🚀 ${chalk.green.bold("Kifli Radar Bot")} 🚀
  ${chalk.cyan("===========================")}
  ${chalk.yellow("✓")} Webhook URL: ${chalk.blue(url)}
  ${chalk.yellow("✓")} Commands added to bot menu
  ${chalk.yellow("✓")} Bot is ready to use
  ${chalk.cyan("===========================")}
  ${chalk.green("✨ Bot initialization complete! ✨")}
`);
