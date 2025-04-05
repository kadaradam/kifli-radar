interface AppConfig {
  MAX_LOGIN_ATTEMPTS: number;
  MAX_SNOOZE_HOURS: number;
}

export const config: AppConfig = {
  MAX_LOGIN_ATTEMPTS: 5,
  MAX_SNOOZE_HOURS: 48,
};
