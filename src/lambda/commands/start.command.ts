import { type DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import type { CommandContext } from "grammy";
import type { BotCommand } from "grammy/types";
import { Resource } from "sst";
import { config } from "~/config";
import { commandName } from "~/utils/commands";
import type { AppContext } from "../context";
import { env } from "../env";

// Command name
export const START_COMMAND_KEY = "start";

// Command metadata for bot menu
export const startCommandInfo: BotCommand = {
  command: START_COMMAND_KEY,
  description: `Jelszó megadása. ${commandName(START_COMMAND_KEY)} «jelszó»`,
};

export const startCommand = async (ctx: CommandContext<AppContext>) => {
  const userId = ctx.from?.id;
  const firstName = ctx.from?.first_name;
  const lastName = ctx.from?.last_name;
  const password = ctx.match;

  if (!userId || !firstName || !lastName) {
    return;
  }

  if (!password) {
    await ctx.reply(
      `Na csumiii ${firstName}!! 👋👋 Én a kifli-radar vagyok! 🍩 Add meg a jelszót a ${commandName(START_COMMAND_KEY)} «jelszó» paranccsal!`,
    );
    return;
  }

  if (ctx.session.userAuthenticatedCache) {
    await ctx.reply("Cimbi már be vagy jelentkezve, mit akarsz még? 😎");
    return;
  }

  let authSource: string | undefined;

  if (!env.AUTH_DISABLED) {
    const appPassword = env.APP_PASSWORDS.find(
      (appPassword) => appPassword.password === password,
    );

    if (!appPassword) {
      const attempts = ++ctx.session.userAuthAttempts;

      await ctx.reply(
        `Bruh, ez nem jó! Próbálkozások száma: ${attempts}/${config.MAX_LOGIN_ATTEMPTS}`,
      );

      if (attempts >= config.MAX_LOGIN_ATTEMPTS) {
        // await ctx.banChatMember(userId);

        await createUser(ctx.dbClient, {
          userId,
          firstName,
          lastName,
          isBanned: true,
        });
        return;
      }

      return;
    }

    authSource = appPassword.name;
  }

  ctx.session.userAuthAttempts = 0;

  await createUser(ctx.dbClient, {
    userId,
    firstName,
    lastName,
    authSource,
  });

  ctx.session.userAuthenticatedCache = true;

  await Promise.all([
    ctx.react("🔥"),
    ctx.reply(
      "Yoo, most már be vagy léptetve! Nézz szét a parancsok között és sok sikert az akció vadászathoz! 🚀🎯",
    ),
  ]);
};

async function createUser(
  dbClient: DynamoDBClient,
  {
    userId,
    firstName,
    lastName,
    authSource,
    isBanned,
  }: {
    userId: number;
    firstName: string;
    lastName: string;
    authSource?: string;
    isBanned?: boolean;
  },
): Promise<void> {
  const now = new Date().toISOString();

  await dbClient.send(
    new PutItemCommand({
      TableName: Resource.UsersTable.name,
      Item: {
        id: { N: userId.toString() },
        firstName: { S: firstName },
        lastName: { S: lastName },
        sleepEnabled: { BOOL: true },
        sleepFrom: { S: "23:00" },
        sleepTo: { S: "07:00" },
        timezone: { S: "Europe/Budapest" }, // TODO: Later auto detect timezone
        ...(authSource && { authSource: { S: authSource } }),
        ...(isBanned && { isBanned: { BOOL: true } }),
        createdAt: { S: now },
        updatedAt: { S: now },
      },
    }),
  );
}
