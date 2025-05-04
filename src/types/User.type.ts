export interface User {
  id: number;
  firstName: string;
  lastName: string;
  sleepEnabled: boolean;
  sleepFrom: string;
  sleepTo: string;
  timezone: string;
  authSource?: string;
  isBanned?: boolean;
  lastNotifiedAt?: string;
  createdAt: Date;
  updatedAt: Date;
}
