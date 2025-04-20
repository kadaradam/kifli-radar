import type { ConversationFlavor } from "@grammyjs/conversations";
import type { Context, SessionFlavor } from "grammy";
import type { ICachedDBClient } from "~/types";
import type { SessionData } from "./session";

export type AppContext = Context &
  ConversationFlavor<Context> &
  SessionFlavor<SessionData> & {
    db: ICachedDBClient;
  };
