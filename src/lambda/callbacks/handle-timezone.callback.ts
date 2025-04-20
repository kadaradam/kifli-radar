import type { UpdateItemCommandOutput } from "@aws-sdk/client-dynamodb";
import type { Message } from "grammy/types";
import { Resource } from "sst";
import tzlookup from "tz-lookup";
import type { ICachedDBClient } from "~/types";
import type { AppContext } from "../context";

type Ctx = AppContext & {
  message: Message.LocationMessage;
};

export const handleTimezoneCallback = async (ctx: Ctx) => {
  const userId = ctx.from?.id!;
  const { latitude, longitude } = ctx.message.location;
  const { db } = ctx;

  const timezone = tzlookup(latitude, longitude);

  await saveUserTimezone(db, {
    userId,
    timezone,
  });

  await ctx.reply(
    `Na, ezt jól megcsináltad! 🎯\nMost már pontosan tudom, hogy '${timezone}' van nálad, szóval nem fogok éjjel 3-kor kifliért ébreszteni! 😄`,
  );

  ctx.session.isUserRequestingLocation = false;
};

const saveUserTimezone = async (
  db: ICachedDBClient,
  { userId, timezone }: { userId: number; timezone: string },
): Promise<UpdateItemCommandOutput> =>
  db.updateItem(
    {
      TableName: Resource.UsersTable.name,
      Key: {
        id: { N: userId.toString() },
      },
      UpdateExpression: "SET #tz = :timezone",
      ExpressionAttributeNames: {
        "#tz": "timezone",
      },
      ExpressionAttributeValues: {
        ":timezone": { S: timezone },
      },
    },
    { cacheKey: userId.toString() },
  );
