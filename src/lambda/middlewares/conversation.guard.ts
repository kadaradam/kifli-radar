import type { NextFunction } from "grammy";
import type { AppContext } from "../context";

// Middleware to block other commands/messages while user is in conversation
export const conversationGuard =
  () => async (ctx: AppContext, next: NextFunction) => {
    if (ctx.conversation.active("askForDiscountValue")) {
      // If the user is in a conversation, prevent any other commands or messages
      return;
    }

    await next();
  };
