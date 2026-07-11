import commonTypes from '@src/app/core/config/commonTypes';

const types = {
  ...commonTypes,
  CustomerRepository: Symbol.for('CustomerRepository'),
  CustomerAuthorizationPolicy: Symbol.for('CustomerAuthorizationPolicy'),
  CustomerClock: Symbol.for('CustomerClock'),
  CustomerIdGenerator: Symbol.for('CustomerIdGenerator'),
  CustomerSalesHistoryReader: Symbol.for('CustomerSalesHistoryReader'),
  CreateCustomerHandler: Symbol.for('CreateCustomerHandler'),
  UpdateCustomerHandler: Symbol.for('UpdateCustomerHandler'),
  DeactivateCustomerHandler: Symbol.for('DeactivateCustomerHandler'),
  GetCustomerByIdHandler: Symbol.for('GetCustomerByIdHandler'),
  ListCustomersHandler: Symbol.for('ListCustomersHandler'),
  SearchCustomersHandler: Symbol.for('SearchCustomersHandler'),
  GetCustomerSalesHistoryHandler: Symbol.for('GetCustomerSalesHistoryHandler'),
};

export default types;
