import { SaleRepository } from '@src/app/modules/sales/application/ports/SalesRepositories';
import { SalesAuthorizationPolicy } from '@src/app/modules/sales/application/ports/SalesServices';
import { authorizeSalesRead } from '@src/app/modules/sales/application/shared/SalesGuards';
import { SaleSnapshot } from '@src/app/modules/sales/domain/Sale';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class ListSalesHandler {
  constructor(
    private readonly sales: SaleRepository,
    private readonly authorization: SalesAuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal): Promise<SaleSnapshot[]> {
    authorizeSalesRead(this.authorization, principal);
    return this.sales.list(principal.storeId);
  }
}
