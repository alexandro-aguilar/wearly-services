import { CustomerRepository } from '@src/app/modules/customers/application/ports/CustomerRepositories';
import { CustomerAuthorizationPolicy } from '@src/app/modules/customers/application/ports/CustomerServices';
import { authorizeCustomerRead } from '@src/app/modules/customers/application/shared/CustomerGuards';
import { CustomerSnapshot } from '@src/app/modules/customers/domain/Customer';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export class SearchCustomersHandler {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly authorization: CustomerAuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal, search: string): Promise<CustomerSnapshot[]> {
    authorizeCustomerRead(this.authorization, principal);
    const normalized = search?.trim().toLowerCase();
    if (!normalized) throw new ValidationError('Customer search is required.');
    return this.customers.list(principal.storeId, { active: true, search: normalized });
  }
}
