export interface WatchProduct {
  userId: number;
  productId: number;
  productName: string;
  minDiscountPercentage: number;
  deletedAt?: string;
  lastNotifiedAt?: string;
  createdAt: Date;
  updatedAt: Date;
}
