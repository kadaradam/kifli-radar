export interface WatchProduct {
  userId: number;
  productId: number;
  productName: string;
  minDiscountPercentage: number;
  isDeleted?: boolean;
  lastNotifiedAt?: Date;
  notifyAfter?: Date;
  createdAt: Date;
  updatedAt: Date;
}
