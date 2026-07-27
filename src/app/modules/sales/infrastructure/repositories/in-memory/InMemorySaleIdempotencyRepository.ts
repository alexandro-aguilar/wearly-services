import {
  SaleIdempotencyRecord,
  SaleIdempotencyRepository,
} from '@src/app/modules/sales/application/ports/CheckoutQuotePorts';
export class InMemorySaleIdempotencyRepository implements SaleIdempotencyRepository {
  private readonly records = new Map<string, SaleIdempotencyRecord>();
  async find(storeId: string, key: string) {
    return this.records.get(`${storeId}:${key}`);
  }
  async findBySaleId(storeId: string, saleId: string) {
    return [...this.records.values()].find((record) => record.storeId === storeId && record.saleId === saleId);
  }
  async claim(record: SaleIdempotencyRecord): Promise<{ claimed: boolean; record: SaleIdempotencyRecord }> {
    const existing = await this.find(record.storeId, record.key);
    if (existing?.status === 'FAILED') {
      await this.save(record);
      return { claimed: true, record };
    }
    if (existing) return { claimed: false, record: existing };
    await this.save(record);
    return { claimed: true, record };
  }
  async save(record: SaleIdempotencyRecord) {
    this.records.set(`${record.storeId}:${record.key}`, { ...record });
  }
}
