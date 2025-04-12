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

    const productAnalyticsTable = new sst.aws.Dynamo("ProductAnalyticsTable", {
      fields: {
        id: "string",
        productId: "number",
        productName: "string",
        fetchedAt: "string",
        discountPercentage: "number",
        stockQuantity: "number",
      },
      primaryIndex: {
        hashKey: "id",
      },
      globalIndexes: {
        // For querying analytics by product and time
        productTimeIndex: {
          hashKey: "productId",
          rangeKey: "fetchedAt",
          projection: "all",
        },
        // For tracking stock changes
        stockAnalysisIndex: {
          hashKey: "productId",
          rangeKey: "stockQuantity",
          projection: "all",
        },
        // For product performance analysis
        productAnalysisIndex: {
          hashKey: "productName",
          rangeKey: "fetchedAt",
          projection: "all",
        },
        // For category-based analysis
        /*   categoryAnalysisIndex: {
          hashKey: "categoryId",
          rangeKey: "fetchedAt",
          projection: "all",
        }, */
        // For analyzing discount effectiveness
        discountRangeIndex: {
          hashKey: "discountPercentage",
          rangeKey: "fetchedAt",
          projection: "all",
        },
        // For tracking product discount history
        productDiscountHistoryIndex: {
          hashKey: "productId",
          rangeKey: "discountPercentage",
          projection: "all",
        },
      },
      transform: {
        table: {
          billingMode: "PAY_PER_REQUEST",
        },
      },
    });

    new sst.aws.Cron("FetchProductsCron", {
      schedule: "rate(30 minutes)",
      function: {
        handler: "src/cron.handler",
        timeout: "30 seconds",
        memory: "128 MB",
        link: [usersTable, watchProductsTable, productAnalyticsTable],
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
