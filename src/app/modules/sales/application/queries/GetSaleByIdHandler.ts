import { SaleRepository } from '@src/app/modules/sales/application/ports/SalesRepositories';
import { SalesAuthorizationPolicy } from '@src/app/modules/sales/application/ports/SalesServices';
import { authorizeSalesRead } from '@src/app/modules/sales/application/shared/SalesGuards';
import { SaleSnapshot } from '@src/app/modules/sales/domain/Sale';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { NotFoundError } from '@src/shared/domain/exceptions/PlatformError';

export class GetSaleByIdHandler {
  constructor(
    private readonly sales: SaleRepository,
    private readonly authorization: SalesAuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal, saleId: string): Promise<SaleSnapshot> {
    authorizeSalesRead(this.authorization, principal);
    const sale = await this.sales.findById(principal.storeId, saleId);
    if (!sale) {
      throw new NotFoundError('Sale was not found.');
    }
    return sale;
  }
}
