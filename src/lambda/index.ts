import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { BotError, webhookCallback } from "grammy";
import bot from "./bot";
import type { AppContext } from "./context";

const webhookHandler = webhookCallback<AppContext>(bot, "aws-lambda-async");

/* export const handler = webhookCallback<AppContext>(bot, "aws-lambda-async"); */
export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    return await webhookHandler(event);
  } catch (err: unknown) {
    console.error("Lambda handler error:", {
      error: err,
      event: {
        body: event.body,
        headers: event.headers,
      },
    });

    if (err instanceof BotError && err.ctx) {
      try {
        await err.ctx.reply(
          "Fúú bazzeg szerintem részeg vagyok, mert nem tudok mit kezdeni a kéréssel. 🍺",
        );
      } catch (replyError) {
        console.error("Failed to send error message:", replyError);
      }
    }

    // Send a 200 response to the client, so Telegram doesn't retry
    return {
      statusCode: 200,
      body: "OK",
    };
  }
};
