export interface User {
  id: number;
  firstName: string;
  lastName: string;
  sleepEnabled: boolean;
  sleepFrom: string;
  sleepTo: string;
  timezone: string;
  authSource?: string;
  lastNotifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
