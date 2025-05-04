import dotenv from "dotenv";
import type { AppConfig } from "../types";
import { mockedResources } from "./constants";

// Load environment variables from .env.example
dotenv.config({ path: ".env.example" });

jest.mock("../config", () => ({
  config: {
    MAX_LOGIN_ATTEMPTS: 5,
    NEW_NOTIFICATION_THRESHOLD_IN_HOURS: 24,
    MIN_DISCOUNT_PERCENTAGE_FOR_ANALYTICS: 10,
  } as AppConfig,
}));

jest.mock("sst", () => {
  return {
    Resource: mockedResources,
  };
});
