import type { NextFunction } from "grammy";
import { Resource } from "sst";
import type { ICachedDBClient, User } from "~/types";
import { commandName } from "~/utils/commands";
import { START_COMMAND_KEY } from "../commands";
import type { AppContext } from "../context";

const PUBLIC_COMMANDS = [commandName(START_COMMAND_KEY)];

// Middleware to check if the user is authorized
export const authGuard = () => async (ctx: AppContext, next: NextFunction) => {
  const userId = ctx.from?.id!;
  const { db } = ctx;

  const isCacheUserAuthenticated = checkCacheUserAuthenticated(ctx);

  if (isCacheUserAuthenticated) {
    await next();

    return;
  }

  const [isUserDBAuthenticated, isUserBanned] = await checkDBUserAuthenticated(
    db,
    userId,
  );

  if (isUserDBAuthenticated) {
    ctx.session.userAuthenticatedCache = true;

    await next();

    return;
  }

  if (isUserBanned) {
    await ctx.reply("Bocsi, de ez a fiók le lett tiltva.");
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
  db: ICachedDBClient,
  userId: number,
): Promise<[boolean, boolean]> {
  const user = await db.getItem<Pick<User, "id" | "isBanned">>(
    {
      TableName: Resource.UsersTable.name,
      Key: { id: { N: userId.toString() } },
      ProjectionExpression: "id, isBanned",
    },
    { cacheKey: userId.toString() },
  );

  const isBanned = !!user?.isBanned;
  const isAuthenticated = isBanned ? false : !!user;

  return [isAuthenticated, isBanned];
}

function checkCacheUserAuthenticated(ctx: AppContext): boolean {
  if (ctx.session.userAuthenticatedCache === undefined) {
    return false;
  }

  return ctx.session.userAuthenticatedCache;
}
