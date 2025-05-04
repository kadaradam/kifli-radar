import type { User, WatchProduct } from "~/types";
import {
  WatchProductFactory,
  type WatchProductFactoryArgs,
} from "./watch-product.factory";

export interface UserFactoryArgs {
  id?: number;
  firstName?: string;
  lastName?: string;
  sleepEnabled?: boolean;
  sleepFrom?: string;
  sleepTo?: string;
  timezone?: string;
  lastNotifiedAt?: string;
}

export type WatchProductFactoryArgsWithoutUserId = Omit<
  WatchProductFactoryArgs,
  "userId"
>;

export class UserFactory {
  private args: UserFactoryArgs;
  private watchProducts: WatchProductFactoryArgsWithoutUserId[] = [];

  constructor(args: UserFactoryArgs = {}) {
    this.args = args;
  }

  products(
    productsArgs:
      | WatchProductFactoryArgsWithoutUserId[]
      | WatchProductFactoryArgsWithoutUserId,
  ): this {
    this.watchProducts = Array.isArray(productsArgs)
      ? productsArgs
      : [productsArgs];
    return this;
  }

  build(): { user: User; watchProducts: WatchProduct[] } {
    const now = new Date();
    const userId = this.args.id ?? Math.floor(Math.random() * 1000000);

    const user: User = {
      id: userId,
      firstName: this.args.firstName ?? "John",
      lastName: this.args.lastName ?? "Doe",
      sleepEnabled: this.args.sleepEnabled ?? false,
      sleepFrom: this.args.sleepFrom ?? "23:00",
      sleepTo: this.args.sleepTo ?? "07:00",
      timezone: this.args.timezone ?? "Europe/Budapest",
      lastNotifiedAt: this.args.lastNotifiedAt,
      createdAt: now,
      updatedAt: now,
    };

    const watchProducts = new WatchProductFactory(
      this.watchProducts.map(
        (productArgs) =>
          ({
            userId,
            productId: productArgs.productId,
            productName: productArgs.productName,
            minDiscountPercentage: productArgs.minDiscountPercentage,
            deletedAt: productArgs.deletedAt,
            lastNotifiedAt: productArgs.lastNotifiedAt,
          }) as WatchProductFactoryArgs,
      ),
    ).build();

    return { user, watchProducts };
  }
}
