/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "kifli-radar",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          region: "eu-central-1",
        },
      },
    };
  },
  async run() {
    const usersTable = new sst.aws.Dynamo("UsersTable", {
      fields: {
        id: "number",
        notifyAfterPK: "string",
        notifyAfter: "string",
      },
      primaryIndex: { hashKey: "id" },
      globalIndexes: {
        byNotifyAfter: {
          hashKey: "notifyAfterPK",
          rangeKey: "notifyAfter",
          projection: "all",
        },
      },
      transform: {
        table: {
          billingMode: "PAY_PER_REQUEST",
        },
      },
    });

    const watchProductsTable = new sst.aws.Dynamo("WatchProductsTable", {
      fields: {
        userId: "number",
        productId: "number",
      },
      primaryIndex: { hashKey: "userId", rangeKey: "productId" },
      globalIndexes: {
        byProductId: {
          hashKey: "productId",
          rangeKey: "userId",
          projection: "all",
        },
        byUserId: {
          hashKey: "userId",
          rangeKey: "productId",
          projection: "all",
        },
      },
    });

    new sst.aws.Cron("FetchProductsCron", {
      schedule: "rate(30 minutes)",
      function: {
        handler: "src/cron.handler",
        timeout: "30 seconds",
        memory: "128 MB",
        link: [usersTable, watchProductsTable],
        environment: {
          TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN!,
          NODE_ENV: process.env.NODE_ENV!,
        },
      },
    });

    new sst.aws.Function("TelegramBotWebhook", {
      url: true,
      handler: "src/lambda/index.handler",
      timeout: "30 seconds",
      memory: "128 MB",
      link: [usersTable, watchProductsTable],
      permissions: [
        {
          actions: ["dynamodb:Query", "dynamodb:UpdateItem"],
          resources: [watchProductsTable.arn],
        },
      ],
      environment: {
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN!,
        NODE_ENV: process.env.NODE_ENV!,
        APP_PASSWORD: process.env.APP_PASSWORD!,
      },
    });
  },
});
