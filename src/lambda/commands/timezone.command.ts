import type { CommandContext } from "grammy";
import type { BotCommand } from "grammy/types";
import type { AppContext } from "../context";

// Command name
export const TIMEZONE_COMMAND_KEY = "timezone";

// Command metadata for bot menu
export const timezoneCommandInfo: BotCommand = {
  command: TIMEZONE_COMMAND_KEY,
  description: "Időzóna beállítása 📍",
};

export const timezoneCommand = async (ctx: CommandContext<AppContext>) => {
  ctx.session.isUserRequestingLocation = true;

  await ctx.reply(
    "Hé, kifli detektív vagyok! 🔍\nHogy pontosan tudjam, mikor van kifli akció, meg kell tudnom, hol vagy! Küldd el a helyzetedet, és én majd kitalálom, milyen időzónában vagy! 📍",
    {
      reply_markup: {
        keyboard: [
          [{ text: "📍 Küldöm a helyzetem!", request_location: true }],
        ],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    },
  );
};
