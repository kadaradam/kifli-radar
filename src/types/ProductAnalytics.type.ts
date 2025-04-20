export interface ProductAnalytics {
  id: string;
  productId: number;
  productName: string;
  fetchedAt: string;
  discountPercentage: number;
  stockQuantity: number;
  originalPrice: number;
  salePrice: number;
}
