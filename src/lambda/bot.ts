import { conversations, createConversation } from "@grammyjs/conversations";
import { limit } from "@grammyjs/ratelimiter";
import { Bot, session } from "grammy";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { KifliService } from "~/services/kifli.service";
import {
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
import type { AppContext } from "./context";
import {
  ASK_FOR_DISCOUNT_VALUE_KEY,
  askForDiscountValue,
} from "./conversations";
import { env } from "./env";
import { authGuard, conversationGuard, groupChatGuard } from "./middlewares";
import { getSessionKey, initialSessionData } from "./session";

const botToken = env.TELEGRAM_BOT_TOKEN;

const dbClient = new DynamoDBClient();
const bot = new Bot<AppContext>(botToken);
const kifliService = new KifliService();
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
  .use(
    createConversation(
      askForDiscountValue(dbClient),
      ASK_FOR_DISCOUNT_VALUE_KEY,
    ),
  );

// Middlewares
bot.use(groupChatGuard()).use(authGuard(dbClient)).use(conversationGuard());

// Callbacks: Handle button clicks
// Must registered separately
bot.callbackQuery(/^add_confirm\:(.+)$/, productAddConfirmCallback);
bot.callbackQuery(/^add_cancel\:(.+)$/, productAddCancelCallback);
bot.callbackQuery(/^remove\:(.+)$/, productRemoveCallback(dbClient));

// Commands
// Must registered separately
bot.command(START_COMMAND_KEY, startCommand(dbClient));
bot.command(ADD_COMMAND_KEY, addCommand(dbClient, kifliService));
bot.command(REMOVE_COMMAND_KEY, removeCommand(dbClient));
bot.command(SLEEP_COMMAND_KEY, sleepCommand(dbClient));
// attach all middleware
bot.on("message", async (ctx) => {
  if (ctx.message?.text?.startsWith("/")) return; // Ignore commands
  await ctx.reply("Szia tesó! Mit akarsz? 😎");
});

// Listen for "my_chat_member" updates
bot.on("my_chat_member", async (ctx) => {
  const newMember = ctx.update.my_chat_member.new_chat_member;

  if (newMember.status === "member") {
    await ctx.api.sendMessage(
      ctx.chat.id,
      "Na csumiii!! 👋👋  Én a kifli-radar vagyok! 🍩 Add meg a kívánt kedvezmény értékét százalékban, és értesítelekk, ha leesik! 💸",
    );
  }
});

export default bot;
