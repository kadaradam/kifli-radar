import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { ConversationFlavor } from "@grammyjs/conversations";
import type { Context, SessionFlavor } from "grammy";
import type { SessionData } from "./session";

export type AppContext = Context &
  ConversationFlavor<Context> &
  SessionFlavor<SessionData> & {
    dbClient: DynamoDBClient;
  };
