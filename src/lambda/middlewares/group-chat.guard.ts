import type { NextFunction } from "grammy";
import type { AppContext } from "../context";

// Middleware to allow only group chats
export const groupChatGuard =
  () => async (ctx: AppContext, next: NextFunction) => {
    // Check if the message is from a group (i.e., not a private chat)
    if (ctx.chat?.type !== "private") {
      return; // Ignore messages in groups
    }

    await next();
  };
