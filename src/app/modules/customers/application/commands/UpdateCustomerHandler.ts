import { CustomerRepository } from '@src/app/modules/customers/application/ports/CustomerRepositories';
import {
  CustomerAuthorizationPolicy,
  CustomerClock,
} from '@src/app/modules/customers/application/ports/CustomerServices';
import { authorizeCustomerManage } from '@src/app/modules/customers/application/shared/CustomerGuards';
import { Customer, UpdateCustomerInput } from '@src/app/modules/customers/domain/Customer';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { NotFoundError } from '@src/shared/domain/exceptions/PlatformError';

export type UpdateCustomerCommand = Omit<UpdateCustomerInput, 'now'>;

export class UpdateCustomerHandler {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly authorization: CustomerAuthorizationPolicy,
    private readonly clock: CustomerClock
  ) {}

  async execute(principal: AuthenticatedPrincipal, id: string, command: UpdateCustomerCommand): Promise<void> {
    authorizeCustomerManage(this.authorization, principal);
    const snapshot = await this.customers.findById(principal.storeId, id);
    if (!snapshot) throw new NotFoundError('Customer was not found.');
    const customer = Customer.rehydrate(snapshot);
    customer.update({ ...command, now: this.clock.now() });
    await this.customers.save(customer.toSnapshot());
  }
}
