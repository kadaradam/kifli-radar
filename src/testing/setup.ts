import dotenv from "dotenv";
import { mockedResources } from "./constants";

// Load environment variables from .env.example
dotenv.config({ path: ".env.example" });

jest.mock("sst", () => {
  return {
    Resource: mockedResources,
  };
});
