import chalk from "chalk";
import { setupWebhook } from "../src/lambda/setup";

const args = process.argv.slice(2);
const urlArgIndex = args.findIndex((arg) => arg === "--url");
const url = urlArgIndex !== -1 ? args[urlArgIndex + 1].trim() : undefined;

// Validate url
if (!url || !url.startsWith("https://")) {
  console.error("Please provide a valid url");
  process.exit(1);
}

(async () => {
  const isAlreadySet = await setupWebhook(url);

  if (!isAlreadySet) {
    console.log(chalk.yellow(`ℹ️  Webhook already set to ${chalk.blue(url)}`));
    return;
  }

  console.log(`
    🚀 ${chalk.green.bold("Kifli Radar Bot")} 🚀
    ${chalk.cyan("===========================")}
    ${chalk.yellow("✓")} Webhook URL: ${chalk.blue(url)}
    ${chalk.yellow("✓")} Commands added to bot menu
    ${chalk.yellow("✓")} Bot is ready to use
    ${chalk.cyan("===========================")}
    ${chalk.green("✨ Bot initialization complete! ✨")}
  `);
})();
