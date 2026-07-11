import { randomUUID } from 'node:crypto';
import { IdGenerator } from '@src/app/modules/catalog/application/ports/CatalogServices';

export class CryptoIdGenerator implements IdGenerator {
  nextId(): string {
    return randomUUID();
  }
}
