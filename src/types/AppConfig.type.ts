export type AppWebhookConfig = {
  MAX_LOGIN_ATTEMPTS: number;
};

export type AppCronConfig = {
  NEW_NOTIFICATION_THRESHOLD_IN_HOURS: number;
  MIN_DISCOUNT_PERCENTAGE_FOR_ANALYTICS: number;
  ANALYTICS_MAX_BATCH_SIZE: number;
};
