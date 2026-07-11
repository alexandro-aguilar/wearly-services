import { CustomerRepository } from '@src/app/modules/customers/application/ports/CustomerRepositories';
import { CustomerAuthorizationPolicy } from '@src/app/modules/customers/application/ports/CustomerServices';
import { authorizeCustomerRead } from '@src/app/modules/customers/application/shared/CustomerGuards';
import { CustomerSnapshot } from '@src/app/modules/customers/domain/Customer';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { NotFoundError } from '@src/shared/domain/exceptions/PlatformError';

export class GetCustomerByIdHandler {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly authorization: CustomerAuthorizationPolicy
  ) {}

  async execute(principal: AuthenticatedPrincipal, id: string): Promise<CustomerSnapshot> {
    authorizeCustomerRead(this.authorization, principal);
    const customer = await this.customers.findById(principal.storeId, id);
    if (!customer) throw new NotFoundError('Customer was not found.');
    return customer;
  }
}
