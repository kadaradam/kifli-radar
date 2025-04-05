import type { CallbackQueryContext } from "grammy";
import type { AppContext } from "../context";

export async function productAddCancelCallback(
  ctx: CallbackQueryContext<AppContext>,
) {
  // Remove user selected product
  ctx.session.userWatchSelectedProduct = undefined;

  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup({ reply_markup: undefined }); // Remove the inline keyboard by editing the original message

  await ctx.reply(
    "❌ Oké tesó, gondold át még egyszer! Ha meggondoldtad magad, küldd újra a linket! 🤔",
  );
}
