import { CustomerRepository } from '@src/app/modules/customers/application/ports/CustomerRepositories';
import {
  CustomerAuthorizationPolicy,
  CustomerSaleHistoryItem,
  CustomerSalesHistoryReader,
} from '@src/app/modules/customers/application/ports/CustomerServices';
import { authorizeCustomerRead } from '@src/app/modules/customers/application/shared/CustomerGuards';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { NotFoundError } from '@src/shared/domain/exceptions/PlatformError';

export class GetCustomerSalesHistoryHandler {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly history: CustomerSalesHistoryReader,
    private readonly authorization: CustomerAuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal, customerId: string): Promise<CustomerSaleHistoryItem[]> {
    authorizeCustomerRead(this.authorization, principal);
    const customer = await this.customers.findById(principal.storeId, customerId);
    if (!customer) throw new NotFoundError('Customer was not found.');
    return this.history.listByCustomer(principal.storeId, customerId);
  }
}
