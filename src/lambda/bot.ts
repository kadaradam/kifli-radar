import { conversations, createConversation } from "@grammyjs/conversations";
import { limit } from "@grammyjs/ratelimiter";
import { Bot, session } from "grammy";

import { KifliService } from "~/services/kifli.service";
import {
  handleTimezoneCallback,
  productAddCancelCallback,
  productAddConfirmCallback,
  productRemoveCallback,
} from "./callbacks";
import {
  ADD_COMMAND_KEY,
  REMOVE_COMMAND_KEY,
  SLEEP_COMMAND_KEY,
  START_COMMAND_KEY,
  addCommand,
  removeCommand,
  sleepCommand,
  startCommand,
} from "./commands";
import {
  TIMEZONE_COMMAND_KEY,
  timezoneCommand,
} from "./commands/timezone.command";
import type { AppContext } from "./context";
import {
  ASK_FOR_DISCOUNT_VALUE_KEY,
  askForDiscountValue,
} from "./conversations";
import { env } from "./env";
import {
  authGuard,
  conversationGuard,
  db,
  groupChatGuard,
} from "./middlewares";
import { getSessionKey, initialSessionData } from "./session";

const botToken = env.TELEGRAM_BOT_TOKEN;

const bot = new Bot<AppContext>(botToken);
const kifliService = new KifliService();

// Global services
bot.use(db());

bot
  // External plugins
  .use(limit())
  .use(
    session({
      initial: initialSessionData,
      getSessionKey,
    }),
  )
  .use(conversations())
  .use(createConversation(askForDiscountValue(), ASK_FOR_DISCOUNT_VALUE_KEY));

// Guard middlewares
bot.use(groupChatGuard()).use(authGuard()).use(conversationGuard());

// Callbacks: Handle button clicks
// Must registered separately
bot.callbackQuery(/^add_confirm\:(.+)$/, productAddConfirmCallback);
bot.callbackQuery(/^add_cancel\:(.+)$/, productAddCancelCallback);
bot.callbackQuery(/^remove\:(.+)$/, productRemoveCallback);

// Commands
// Must registered separately
bot.command(START_COMMAND_KEY, startCommand);
bot.command(ADD_COMMAND_KEY, addCommand(kifliService));
bot.command(REMOVE_COMMAND_KEY, removeCommand);
bot.command(SLEEP_COMMAND_KEY, sleepCommand);
bot.command(TIMEZONE_COMMAND_KEY, timezoneCommand);

// attach all middleware
bot.on("message:text", async (ctx) => {
  if (ctx.message?.text?.startsWith("/")) return; // Ignore commands
  await ctx.reply("Szia tesó! Mit akarsz? 😎");
});

bot.on("message:location", (ctx) => {
  if (ctx.session.isUserRequestingLocation) {
    return handleTimezoneCallback(ctx);
  }
});

export default bot;
