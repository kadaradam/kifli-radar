export interface WatchProduct {
  userId: number;
  productId: number;
  productName: string;
  minDiscountPercentage: number;
  isDeleted?: boolean;
  lastNotifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
