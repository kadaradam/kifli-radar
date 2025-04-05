export interface User {
  id: number;
  firstName: string;
  lastName: string;
  lastNotifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
