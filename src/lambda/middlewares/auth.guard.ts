import { type DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import type { NextFunction } from "grammy";
import { Resource } from "sst";
import { commandName } from "~/utils/commands";
import { START_COMMAND_KEY } from "../commands";
import type { AppContext } from "../context";

const PUBLIC_COMMANDS = [commandName(START_COMMAND_KEY)];

// Middleware to check if the user is authorized
export const authGuard = () => async (ctx: AppContext, next: NextFunction) => {
  const userId = ctx.from?.id!;

  const isCacheUserAuthenticated = checkCacheUserAuthenticated(ctx);

  if (isCacheUserAuthenticated) {
    await next();

    return;
  }

  const isUserDBAuthenticated = await checkDBUserAuthenticated(
    ctx.dbClient,
    userId,
  );

  if (isUserDBAuthenticated) {
    ctx.session.userAuthenticatedCache = true;

    await next();

    return;
  }

  const command = ctx.message?.text?.toLowerCase();

  // Allow /start command for unauthenticated users
  if (command && PUBLIC_COMMANDS.some((c) => command.startsWith(c))) {
    await next();

    return;
  }

  if (!isUserDBAuthenticated) {
    await ctx.reply(
      "Báttya, először add meg a jelszavadat a /start «jelszó» paranccsal! 🔑",
    );
    return;
  }

  return;
};

async function checkDBUserAuthenticated(
  dbClient: DynamoDBClient,
  userId: number,
): Promise<boolean> {
  const user = await dbClient.send(
    new GetItemCommand({
      TableName: Resource.UsersTable.name,
      Key: { id: { N: userId.toString() } },
      ProjectionExpression: "id",
    }),
  );

  return !!user.Item;
}

function checkCacheUserAuthenticated(ctx: AppContext): boolean {
  if (ctx.session.userAuthenticatedCache === undefined) {
    return false;
  }

  return ctx.session.userAuthenticatedCache;
}
