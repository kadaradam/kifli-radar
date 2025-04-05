import type { CallbackQueryContext } from "grammy";
import type { AppContext } from "../context";
import { ASK_FOR_DISCOUNT_VALUE_KEY } from "../conversations";

export async function productAddConfirmCallback(
  ctx: CallbackQueryContext<AppContext>,
) {
  await ctx.answerCallbackQuery(); // Acknowledge button press
  await ctx.editMessageReplyMarkup({ reply_markup: undefined }); // Remove the inline keyboard by editing the original message
  await ctx.reply(
    "✅ Köszi báttya! Most megmondod, hány % kedvezménynél értesítselek? 😎",
    { reply_markup: { force_reply: true } },
  );

  // Start the conversation to get user input
  await ctx.conversation.enter(ASK_FOR_DISCOUNT_VALUE_KEY);
}
