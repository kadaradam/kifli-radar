import type {
  DynamoDBClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "@aws-sdk/client-dynamodb";
import {
  BatchWriteItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import type { AwsStub } from "aws-sdk-client-mock";
import type { ProductAnalytics } from "~/types";
import { mockedResources } from "../constants";

// Type alias for the mocked DynamoDB client instance
type DynamoMock = AwsStub<
  ServiceInputTypes,
  ServiceOutputTypes,
  DynamoDBClientResolvedConfig
>;

/**
 * Asserts that the UpdateItemCommand was called exactly once to update the
 * user's lastNotifiedAt timestamp.
 */
export const expectUserLastNotifiedAtUpdated = (
  dynamoMock: DynamoMock,
  userId: number,
) => {
  const updateUserCalls = dynamoMock.commandCalls(UpdateItemCommand, {
    TableName: mockedResources.UsersTable.name,
    Key: marshall({ id: userId }), // Filter calls for the specific user
  });

  expect(updateUserCalls).toHaveLength(1);
  const callInput = updateUserCalls[0].args[0].input;

  expect(callInput).toEqual(
    expect.objectContaining({
      TableName: mockedResources.UsersTable.name,
      Key: marshall({ id: userId }),
      UpdateExpression: "SET lastNotifiedAt = :now",
      // Check that ExpressionAttributeValues contains ':now' with a string value (ISO date)
      ExpressionAttributeValues: {
        ":now": { S: expect.any(String) },
      },
    }),
  );
  // Optionally, validate the date format more strictly if needed
  expect(callInput.ExpressionAttributeValues?.[":now"].S).toMatch(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  );
};

/**
 * Asserts that no UpdateItemCommand calls were made for the Users table.
 */
export const expectNoUserUpdates = (dynamoMock: DynamoMock) => {
  const updateUserCalls = dynamoMock.commandCalls(UpdateItemCommand, {
    TableName: mockedResources.UsersTable.name,
  });

  expect(updateUserCalls).toHaveLength(0);
};

/**
 * Asserts that the UpdateItemCommand was called for each specified product
 * to update its lastNotifiedAt timestamp.
 */
export const expectProductLastNotifiedAtUpdated = (
  dynamoMock: DynamoMock,
  items: {
    userId: number;
    productId: number;
  }[],
) => {
  const updateProductCalls = dynamoMock.commandCalls(UpdateItemCommand, {
    TableName: mockedResources.WatchProductsTable.name,
  });

  expect(updateProductCalls).toHaveLength(items.length);

  for (const item of items) {
    // Find the specific command call for this user-product combination
    const call = updateProductCalls.find((c) => {
      const inputKey = c.args[0]?.input?.Key;
      return (
        inputKey?.productId?.N === item.productId.toString() &&
        inputKey?.userId?.N === item.userId.toString()
      );
    });

    // Ensure a matching call was found
    expect(call).toBeDefined();

    // Assert the input structure for the found call
    expect(call?.args[0].input).toEqual(
      expect.objectContaining({
        TableName: mockedResources.WatchProductsTable.name,
        Key: marshall({
          productId: item.productId,
          userId: item.userId,
        }),
        UpdateExpression: "SET lastNotifiedAt = :now",
        // Check that ExpressionAttributeValues contains ':now' with a string value (ISO date)
        ExpressionAttributeValues: {
          ":now": { S: expect.any(String) },
        },
      }),
    );
    // Optionally, validate the date format more strictly if needed
    expect(call?.args[0].input.ExpressionAttributeValues?.[":now"].S).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  }
};

/**
 * Asserts that no UpdateItemCommand calls were made for the WatchProducts table.
 */
export const expectNoProductUpdates = (dynamoMock: DynamoMock) => {
  const updateProductCalls = dynamoMock.commandCalls(UpdateItemCommand, {
    TableName: mockedResources.WatchProductsTable.name,
  });

  expect(updateProductCalls).toHaveLength(0);
};

/**
 * Asserts that the BatchWriteItemCommand was called exactly once to insert
 * the specified product analytics data.
 */
export const expectProductAnalyticsInserted = (
  dynamoMock: DynamoMock,
  analytics: ProductAnalytics[],
) => {
  const insertProductAnalyticsCalls = dynamoMock.commandCalls(
    BatchWriteItemCommand,
  );

  expect(insertProductAnalyticsCalls).toHaveLength(1);
  expect(insertProductAnalyticsCalls[0].args[0].input).toEqual(
    expect.objectContaining({
      RequestItems: {
        [mockedResources.ProductAnalyticsTable.name]: analytics.map((item) => ({
          PutRequest: {
            Item: {
              ...marshall(item),
              fetchedAt: {
                S: expect.stringContaining(
                  new Date().toISOString().split("T")[0],
                ),
              }, //
            },
          },
        })),
      },
    }),
  );
};

/**
 * Asserts that no BatchWriteItemCommand calls were made (implying no analytics inserted).
 */
export const expectNoProductAnalyticsInserted = (dynamoMock: DynamoMock) => {
  const insertAnalyticsCalls = dynamoMock.commandCalls(BatchWriteItemCommand);

  expect(insertAnalyticsCalls).toHaveLength(0);
};
