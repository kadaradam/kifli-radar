import type { APIGatewayProxyResult } from "aws-lambda";

export const mockFetch = (
  mockResponses: Array<{ ok: boolean; json?: () => Promise<unknown> }>,
) => {
  global.fetch = jest.fn();

  return mockResponses.map((response) =>
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: response.ok,
        json: response.json || (() => Promise.resolve(null)), // Default to null if no json function provided
      }),
    ),
  );
};

export const mockCryptoUUID = (mockUUID: string) => {
  jest
    .spyOn(crypto, "randomUUID")
    .mockReturnValueOnce(
      mockUUID as `${string}-${string}-${string}-${string}-${string}`,
    );
};

export const expectSuccessLambdaResponse = (result: APIGatewayProxyResult) => {
  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body).message).toBe(
    "Cron job executed successfully!",
  );
};
