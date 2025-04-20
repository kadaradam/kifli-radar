import type { UpdateItemCommandOutput } from "@aws-sdk/client-dynamodb";
import type { CommandContext } from "grammy";
import type { BotCommand } from "grammy/types";
import { Resource } from "sst";
import type { ICachedDBClient, User } from "~/types";
import { commandName } from "~/utils/commands";
import type { AppContext } from "../context";

// Command name
export const SLEEP_COMMAND_KEY = "sleep";

// Command metadata for bot menu
export const sleepCommandInfo: BotCommand = {
  command: SLEEP_COMMAND_KEY,
  description: [
    "Éjszakai értesítések kezelése 🌙",
    "",
    `Értesítések mindig: ${commandName(SLEEP_COMMAND_KEY)} off`,
    `Alvás időzítése: ${commandName(SLEEP_COMMAND_KEY)} <óra-tól> <óra-ig>`,
    "Példa: 23:00 07:00",
    `Jelenlegi beállítás: ${commandName(SLEEP_COMMAND_KEY)} info`,
    "",
    "Mert néha a robotoknak is kell egy kis pihi! 😴",
  ].join("\n"),
};

export const sleepCommand = async (ctx: CommandContext<AppContext>) => {
  const userId = ctx.from?.id;
  const params = ctx.match;
  const { db } = ctx;

  if (!userId || !params) {
    await ctx.reply(sleepCommandInfo.description);
    return;
  }

  if (params === "off") {
    await turnOffSleepMode(db, userId);
    await ctx.reply(
      "🔔 Értesítések mindig bekapcsolva! Most már akkor is értesítünk, ha épp szunyálsz 😈",
    );
    return;
  }

  if (params === "info") {
    const sleepMode = await getSleepMode(db, userId);

    // TypeScript safety, should never happen
    if (!sleepMode) {
      return;
    }

    if (!sleepMode.sleepEnabled) {
      await ctx.reply("🔔 Jelenlegi beállítás: Értesítések mindig");
      return;
    }

    const fromTime = sleepMode.sleepFrom;
    const toTime = sleepMode.sleepTo;

    await ctx.reply(`😴 Pihi időszak: ${fromTime} - ${toTime}`);
    return;
  }

  const [from, to] = params.split(" ");

  if (!from || !to) {
    await ctx.reply("❌ Hoppá! Hiányzó időpontok!");
    return;
  }

  const fromTime = normalizeTime(from);
  const toTime = normalizeTime(to);

  if (!fromTime || !toTime) {
    await ctx.reply(
      "❌ Ejnye! Az időpontot «00:00 23:59» formában kérem szépen!",
    );
    return;
  }

  await turnOnSleepMode(db, {
    userId,
    from: fromTime,
    to: toTime,
  });

  await ctx.reply(
    `🌙 Szundi mód beállítva! ${fromTime} és ${toTime} között csendben maradok 🤫`,
  );
};

const normalizeTime = (time: string): string | null => {
  const [h, m] = time.split(":").map(Number);

  if (Number.isNaN(h) || Number.isNaN(m)) {
    return null;
  }

  if (h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }

  // Safe it in a clean format, to keep the database clean
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

type SleepMode = Pick<User, "sleepEnabled" | "sleepFrom" | "sleepTo">;

const getSleepMode = async (
  db: ICachedDBClient,
  userId: number,
): Promise<SleepMode | null> => {
  return db.getItem<SleepMode>(
    {
      TableName: Resource.UsersTable.name,
      Key: {
        id: { N: userId.toString() },
      },
      ProjectionExpression: "sleepEnabled, sleepFrom, sleepTo",
    },
    { cacheKey: userId.toString() },
  );
};

const turnOnSleepMode = async (
  db: ICachedDBClient,
  { userId, from, to }: { userId: number; from: string; to: string },
): Promise<UpdateItemCommandOutput> => {
  return db.updateItem(
    {
      TableName: Resource.UsersTable.name,
      Key: {
        id: { N: userId.toString() },
      },
      UpdateExpression:
        "SET sleepEnabled = :sleepEnabled, sleepFrom = :sleepFrom, sleepTo = :sleepTo",
      ExpressionAttributeValues: {
        ":sleepEnabled": { BOOL: true },
        ":sleepFrom": { S: from },
        ":sleepTo": { S: to },
      },
    },
    { cacheKey: userId.toString() },
  );
};

const turnOffSleepMode = async (
  db: ICachedDBClient,
  userId: number,
): Promise<UpdateItemCommandOutput> => {
  return db.updateItem(
    {
      TableName: Resource.UsersTable.name,
      Key: {
        id: { N: userId.toString() },
      },
      UpdateExpression: "SET sleepEnabled = :sleepEnabled",
      ExpressionAttributeValues: {
        ":sleepEnabled": { BOOL: false },
      },
    },
    { cacheKey: userId.toString() },
  );
};
