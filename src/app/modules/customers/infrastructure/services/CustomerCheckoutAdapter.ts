import { CustomerRepository } from '@src/app/modules/customers/application/ports/CustomerRepositories';
import { SalesCustomerGateway } from '@src/app/modules/sales/application/ports/SalesRepositories';

export class CustomerCheckoutAdapter implements SalesCustomerGateway {
  constructor(private readonly customers: CustomerRepository) {}

  async isActiveCustomer(storeId: string, customerId: string): Promise<boolean> {
    return (await this.customers.findById(storeId, customerId))?.active === true;
  }
}
