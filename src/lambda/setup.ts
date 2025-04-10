import chalk from "chalk";
import "dotenv/config";
import { Api } from "grammy";
import {
  addCommandInfo,
  removeCommandInfo,
  sleepCommandInfo,
  startCommandInfo,
} from "./commands";
import { env } from "./env";

const botToken = env.TELEGRAM_BOT_TOKEN;

const api = new Api(botToken);

export const setupWebhook = async (url: string) => {
  const webhookInfo = await api.getWebhookInfo();

  if (webhookInfo.url === url) {
    console.log(chalk.yellow(`ℹ️  Webhook already set to ${chalk.blue(url)}`));
    return;
  }

  await Promise.all([
    api.setWebhook(url),
    api.setMyCommands([
      startCommandInfo,
      addCommandInfo,
      removeCommandInfo,
      sleepCommandInfo,
    ]),
  ]);

  console.log(`
    🚀 ${chalk.green.bold("Kifli Radar Bot")} 🚀
    ${chalk.cyan("===========================")}
    ${chalk.yellow("✓")} Webhook URL: ${chalk.blue(url)}
    ${chalk.yellow("✓")} Commands added to bot menu
    ${chalk.yellow("✓")} Bot is ready to use
    ${chalk.cyan("===========================")}
    ${chalk.green("✨ Bot initialization complete! ✨")}
  `);
};
