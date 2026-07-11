import { CustomerRepository } from '@src/app/modules/customers/application/ports/CustomerRepositories';
import {
  CustomerAuthorizationPolicy,
  CustomerClock,
  CustomerIdGenerator,
} from '@src/app/modules/customers/application/ports/CustomerServices';
import { authorizeCustomerManage } from '@src/app/modules/customers/application/shared/CustomerGuards';
import { Customer } from '@src/app/modules/customers/domain/Customer';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';

export interface CreateCustomerCommand {
  readonly name: string;
  readonly phone?: string;
  readonly email?: string;
}

export class CreateCustomerHandler {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly authorization: CustomerAuthorizationPolicy,
    private readonly clock: CustomerClock,
    private readonly ids: CustomerIdGenerator
  ) {}

  async execute(principal: AuthenticatedPrincipal, command: CreateCustomerCommand): Promise<{ id: string }> {
    authorizeCustomerManage(this.authorization, principal);
    const customer = Customer.create({
      ...command,
      id: this.ids.nextId(),
      storeId: principal.storeId,
      now: this.clock.now(),
    }).toSnapshot();
    await this.customers.save(customer);
    return { id: customer.id };
  }
}
