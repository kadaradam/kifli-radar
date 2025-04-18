import "dotenv/config";
import { Api } from "grammy";
import {
  addCommandInfo,
  removeCommandInfo,
  sleepCommandInfo,
  startCommandInfo,
} from "./commands";
import { timezoneCommandInfo } from "./commands/timezone.command";
import { env } from "./env";

const botToken = env.TELEGRAM_BOT_TOKEN;

const api = new Api(botToken);

export const setupWebhook = async (url: string): Promise<boolean> => {
  const webhookInfo = await api.getWebhookInfo();

  if (webhookInfo.url === url) {
    return false;
  }

  await Promise.all([
    api.setWebhook(url),
    api.setMyCommands([
      startCommandInfo,
      addCommandInfo,
      removeCommandInfo,
      sleepCommandInfo,
      timezoneCommandInfo,
    ]),
  ]);

  return true;
};
