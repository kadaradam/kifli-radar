interface AppConfig {
  MAX_LOGIN_ATTEMPTS: number;
  NEW_NOTIFICATION_THRESHOLD_IN_HOURS: number;
}

export const config: AppConfig = {
  MAX_LOGIN_ATTEMPTS: 5,
  NEW_NOTIFICATION_THRESHOLD_IN_HOURS: 24,
};
