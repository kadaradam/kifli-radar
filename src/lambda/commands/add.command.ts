import { type CommandContext, InlineKeyboard } from "grammy";
import type { BotCommand } from "grammy/types";
import { Resource } from "sst";
import type { ICachedDBClient, IKifliService, WatchProduct } from "~/types";
import { commandName } from "~/utils/commands";
import type { AppContext } from "../context";

// Command name
export const ADD_COMMAND_KEY = "add";

// Command metadata for bot menu
export const addCommandInfo: BotCommand = {
  command: ADD_COMMAND_KEY,
  description: `Kifli termék figyelése. ${commandName(ADD_COMMAND_KEY)} «link»`,
};

export const addCommand =
  (kifliService: IKifliService) => async (ctx: CommandContext<AppContext>) => {
    const userId = ctx.from?.id;
    const url = ctx.match;
    const { db } = ctx;

    if (!userId || !url) {
      await ctx.reply("Cimbi, link nélkül nem tudok mit csinálni! 😅");
      return;
    }

    const productId = kifliService.getProductIdFromUrl(url);

    if (!productId) {
      await ctx.reply(
        "Hoppá, ez nem egy jó Kifli link! Nézz rá még egyszer, hogy biztos jó linket adtál-e! 🔍",
      );
      return;
    }

    const product = await kifliService.getProduct(productId);

    if (!product) {
      await ctx.reply(
        "Hoppá, ez nem egy jó Kifli link! Nézz rá még egyszer, hogy biztos jó linket adtál-e! 🔍",
      );
      return;
    }

    const processedProductId = product.id;
    const productName = product.name;
    const productImage = product.images[0];

    if (
      await isProductAlreadyWatched(db, {
        userId,
        productId: processedProductId,
      })
    ) {
      await ctx.reply("Ezt a terméket már figyeljük, wtf? 🤔");
      return;
    }

    const keyboard = new InlineKeyboard()
      .text("✅ Igen, ez a termék", `add_confirm:${productId}`)
      .text("❌ Nem, valami mást keresek", `add_cancel:${productId}`);

    ctx.session.userWatchSelectedProduct = {
      id: processedProductId,
      name: productName,
    };

    if (productImage) {
      await ctx.replyWithPhoto(productImage, {
        caption: `Ezt találtam neked faszi, ez az amit keresel? 🤔\n\n${productName}`,
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(
        `Ezt találtam neked faszi, ez az amit keresel? 🤔\n\n${productName}`,
        {
          parse_mode: "Markdown",
          reply_markup: keyboard,
        },
      );
    }
  };

const isProductAlreadyWatched = async (
  db: ICachedDBClient,
  { userId, productId }: { userId: number; productId: number },
): Promise<boolean> => {
  const product = await db.query<Pick<WatchProduct, "userId">>(
    {
      TableName: Resource.WatchProductsTable.name,
      KeyConditionExpression: "productId = :pid AND userId = :uid",
      FilterExpression: "attribute_not_exists(deletedAt)",
      ExpressionAttributeValues: {
        ":pid": { N: productId.toString() },
        ":uid": { N: userId.toString() },
      },
      Limit: 1,
      ProjectionExpression: "userId",
    },
    { cacheKey: userId.toString() },
  );

  return !!product?.length;
};
