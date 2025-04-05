import type { AppContext } from "./context";

type UserWatchSelectedProduct = {
  id: number;
  name: string;
};

export interface SessionData {
  userAuthenticatedCache: boolean | undefined;
  userAuthAttempts: number;
  userWatchSelectedProduct: UserWatchSelectedProduct | undefined;
}

export const initialSessionData = (): SessionData => {
  return {
    userAuthenticatedCache: undefined,
    userAuthAttempts: 0,
    userWatchSelectedProduct: undefined,
  };
};

// Stores data per user.
export const getSessionKey = (
  ctx: Omit<AppContext, "session">,
): string | undefined => {
  // Give every user their personal session storage
  // (will be shared across groups and in their private chat)
  return ctx.from?.id.toString();
};
