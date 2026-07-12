import {
  SaleIdempotencyRecord,
  SaleIdempotencyRepository,
} from '@src/app/modules/sales/application/ports/CheckoutQuotePorts';
export class InMemorySaleIdempotencyRepository implements SaleIdempotencyRepository {
  private readonly records = new Map<string, SaleIdempotencyRecord>();
  async find(storeId: string, key: string) {
    return this.records.get(`${storeId}:${key}`);
  }
  async save(record: SaleIdempotencyRecord) {
    this.records.set(`${record.storeId}:${record.key}`, { ...record });
  }
}
