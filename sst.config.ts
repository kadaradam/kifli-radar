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
      },
      primaryIndex: { hashKey: "id" },
      globalIndexes: {},
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
        userProductsIndex: {
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

    const telegramBotWebhook = new sst.aws.Function("TelegramBotWebhook", {
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
        APP_PASSWORDS: process.env.APP_PASSWORDS!,
        AUTH_DISABLED: process.env.AUTH_DISABLED!,
        NODE_ENV: process.env.NODE_ENV!,
        DEBUG: "grammy*",
      },
    });

    new sst.x.DevCommand("WebhookSetup", {
      link: [telegramBotWebhook, usersTable, watchProductsTable],
      dev: {
        autostart: true,
        command: "pnpm sst:init",
      },
    });
  },
});
