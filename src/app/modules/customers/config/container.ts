import { Container } from 'inversify';
import ILogger from '@src/app/core/utils/ILogger';
import MetricsService from '@src/app/core/utils/MetricsService';
import PowertoolsLoggerAdapter from '@src/app/core/utils/Logger';
import TracerService from '@src/app/core/utils/TracerService';
import { CryptoIdGenerator } from '@src/app/core/utils/CryptoIdGenerator';
import { CreateCustomerHandler } from '@src/app/modules/customers/application/commands/CreateCustomerHandler';
import { DeactivateCustomerHandler } from '@src/app/modules/customers/application/commands/DeactivateCustomerHandler';
import { UpdateCustomerHandler } from '@src/app/modules/customers/application/commands/UpdateCustomerHandler';
import { CustomerRepository } from '@src/app/modules/customers/application/ports/CustomerRepositories';
import {
  CustomerAuthorizationPolicy,
  CustomerClock,
  CustomerIdGenerator,
  CustomerSalesHistoryReader,
} from '@src/app/modules/customers/application/ports/CustomerServices';
import { RoleBasedCustomerAuthorizationPolicy } from '@src/app/modules/customers/application/CustomerAuthorizationPolicy';
import { GetCustomerByIdHandler } from '@src/app/modules/customers/application/queries/GetCustomerByIdHandler';
import { GetCustomerSalesHistoryHandler } from '@src/app/modules/customers/application/queries/GetCustomerSalesHistoryHandler';
import { ListCustomersHandler } from '@src/app/modules/customers/application/queries/ListCustomersHandler';
import { SearchCustomersHandler } from '@src/app/modules/customers/application/queries/SearchCustomersHandler';
import types from '@src/app/modules/customers/config/types';
import { InMemoryCustomerRepository } from '@src/app/modules/customers/infrastructure/repositories/in-memory/InMemoryCustomerRepository';
import { SalesCustomerHistoryReader } from '@src/app/modules/customers/infrastructure/services/SalesCustomerHistoryReader';
import { InMemorySaleRepository } from '@src/app/modules/sales/infrastructure/repositories/in-memory/InMemorySaleRepository';
import { SystemClock } from '@src/shared/application/Clock';

const container = new Container();
container.bind<ILogger>(types.Logger).to(PowertoolsLoggerAdapter).inSingletonScope();
container.bind<MetricsService>(types.MetricsService).to(MetricsService).inSingletonScope();
container.bind<TracerService>(types.TracerService).to(TracerService).inSingletonScope();
container.bind<CustomerRepository>(types.CustomerRepository).to(InMemoryCustomerRepository).inSingletonScope();
container
  .bind<CustomerAuthorizationPolicy>(types.CustomerAuthorizationPolicy)
  .to(RoleBasedCustomerAuthorizationPolicy)
  .inSingletonScope();
container.bind<CustomerClock>(types.CustomerClock).to(SystemClock).inSingletonScope();
container.bind<CustomerIdGenerator>(types.CustomerIdGenerator).to(CryptoIdGenerator).inSingletonScope();
container
  .bind<CustomerSalesHistoryReader>(types.CustomerSalesHistoryReader)
  .toDynamicValue(() => new SalesCustomerHistoryReader(new InMemorySaleRepository()))
  .inSingletonScope();
container
  .bind<CreateCustomerHandler>(types.CreateCustomerHandler)
  .toDynamicValue(
    (context) =>
      new CreateCustomerHandler(
        context.get<CustomerRepository>(types.CustomerRepository),
        context.get<CustomerAuthorizationPolicy>(types.CustomerAuthorizationPolicy),
        context.get<CustomerClock>(types.CustomerClock),
        context.get<CustomerIdGenerator>(types.CustomerIdGenerator)
      )
  );
container
  .bind<UpdateCustomerHandler>(types.UpdateCustomerHandler)
  .toDynamicValue(
    (context) =>
      new UpdateCustomerHandler(
        context.get<CustomerRepository>(types.CustomerRepository),
        context.get<CustomerAuthorizationPolicy>(types.CustomerAuthorizationPolicy),
        context.get<CustomerClock>(types.CustomerClock)
      )
  );
container
  .bind<DeactivateCustomerHandler>(types.DeactivateCustomerHandler)
  .toDynamicValue(
    (context) =>
      new DeactivateCustomerHandler(
        context.get<CustomerRepository>(types.CustomerRepository),
        context.get<CustomerAuthorizationPolicy>(types.CustomerAuthorizationPolicy),
        context.get<CustomerClock>(types.CustomerClock)
      )
  );
container
  .bind<GetCustomerByIdHandler>(types.GetCustomerByIdHandler)
  .toDynamicValue(
    (context) =>
      new GetCustomerByIdHandler(
        context.get<CustomerRepository>(types.CustomerRepository),
        context.get<CustomerAuthorizationPolicy>(types.CustomerAuthorizationPolicy)
      )
  );
container
  .bind<ListCustomersHandler>(types.ListCustomersHandler)
  .toDynamicValue(
    (context) =>
      new ListCustomersHandler(
        context.get<CustomerRepository>(types.CustomerRepository),
        context.get<CustomerAuthorizationPolicy>(types.CustomerAuthorizationPolicy)
      )
  );
container
  .bind<SearchCustomersHandler>(types.SearchCustomersHandler)
  .toDynamicValue(
    (context) =>
      new SearchCustomersHandler(
        context.get<CustomerRepository>(types.CustomerRepository),
        context.get<CustomerAuthorizationPolicy>(types.CustomerAuthorizationPolicy)
      )
  );
container
  .bind<GetCustomerSalesHistoryHandler>(types.GetCustomerSalesHistoryHandler)
  .toDynamicValue(
    (context) =>
      new GetCustomerSalesHistoryHandler(
        context.get<CustomerRepository>(types.CustomerRepository),
        context.get<CustomerSalesHistoryReader>(types.CustomerSalesHistoryReader),
        context.get<CustomerAuthorizationPolicy>(types.CustomerAuthorizationPolicy)
      )
  );

export default container;
