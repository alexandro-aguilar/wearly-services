import {
  CustomerListFilter,
  CustomerRepository,
} from '@src/app/modules/customers/application/ports/CustomerRepositories';
import { CustomerAuthorizationPolicy } from '@src/app/modules/customers/application/ports/CustomerServices';
import { authorizeCustomerRead } from '@src/app/modules/customers/application/shared/CustomerGuards';
import { CustomerSnapshot } from '@src/app/modules/customers/domain/Customer';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export class ListCustomersHandler {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly authorization: CustomerAuthorizationPolicy
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    filter: CustomerListFilter = { active: true }
  ): Promise<CustomerSnapshot[]> {
    authorizeCustomerRead(this.authorization, principal);
    return this.customers.list(principal.storeId, filter);
  }
}
