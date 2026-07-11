import { ProductVariantRepository } from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { ProductVariantSnapshot } from '@src/app/modules/catalog/domain/ProductVariant';
import { InventoryVariantStockGateway } from '@src/app/modules/inventory/application/ports/InventoryRepositories';
import { InventoryVariantStockSnapshot } from '@src/app/modules/inventory/domain/InventoryVariantStock';

export class InMemoryInventoryVariantStockGateway implements InventoryVariantStockGateway {
  constructor(private readonly variants: ProductVariantRepository) {}

  async findById(storeId: string, productVariantId: string): Promise<InventoryVariantStockSnapshot | undefined> {
    const variant = await this.variants.findById(storeId, productVariantId);
    return variant ? toInventoryVariantStock(variant) : undefined;
  }

  async listLowStock(storeId: string): Promise<InventoryVariantStockSnapshot[]> {
    const variants = await this.variants.list(storeId, { lowStock: true });
    return variants.map((variant) => toInventoryVariantStock(variant));
  }

  async saveStock(variant: InventoryVariantStockSnapshot): Promise<void> {
    const existingVariant = await this.variants.findById(variant.storeId, variant.productVariantId);
    if (!existingVariant) {
      return;
    }

    await this.variants.save({
      ...existingVariant,
      stock: variant.stock,
      updatedAt: variant.updatedAt,
    });
  }
}

function toInventoryVariantStock(variant: ProductVariantSnapshot): InventoryVariantStockSnapshot {
  return {
    storeId: variant.storeId,
    productVariantId: variant.id,
    sku: variant.sku,
    barcode: variant.barcode,
    stock: variant.stock,
    minimumStock: variant.minimumStock,
    active: variant.active,
    updatedAt: variant.updatedAt,
  };
}
