import { CustomerRepository } from '@src/app/modules/customers/application/ports/CustomerRepositories';
import {
  CustomerAuthorizationPolicy,
  CustomerClock,
} from '@src/app/modules/customers/application/ports/CustomerServices';
import { authorizeCustomerDeactivate } from '@src/app/modules/customers/application/shared/CustomerGuards';
import { Customer } from '@src/app/modules/customers/domain/Customer';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { NotFoundError } from '@src/shared/domain/exceptions/PlatformError';

export class DeactivateCustomerHandler {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly authorization: CustomerAuthorizationPolicy,
    private readonly clock: CustomerClock
  ) {}

  async execute(principal: AuthenticatedPrincipal, id: string): Promise<void> {
    authorizeCustomerDeactivate(this.authorization, principal);
    const snapshot = await this.customers.findById(principal.storeId, id);
    if (!snapshot) throw new NotFoundError('Customer was not found.');
    const customer = Customer.rehydrate(snapshot);
    customer.deactivate(this.clock.now());
    await this.customers.save(customer.toSnapshot());
  }
}
