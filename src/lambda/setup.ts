import { Api } from "grammy";
import { addCommandInfo, startCommandInfo } from "./commands";
import { env } from "./env";

const botToken = env.TELEGRAM_BOT_TOKEN;

const api = new Api(botToken);

export const setupWebhook = async (url: string) => {
  await api.setWebhook(url);
  await api.setMyCommands([startCommandInfo, addCommandInfo]);
};
