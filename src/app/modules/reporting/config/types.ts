import commonTypes from '@src/app/core/config/commonTypes';

const types = {
  ...commonTypes,
  ReportingAuthorizationPolicy: Symbol.for('ReportingAuthorizationPolicy'),
  ReportingSalesReader: Symbol.for('ReportingSalesReader'),
  ReportingInventoryReader: Symbol.for('ReportingInventoryReader'),
  GetDailySalesReportHandler: Symbol.for('GetDailySalesReportHandler'),
  GetBestSellersReportHandler: Symbol.for('GetBestSellersReportHandler'),
  GetLowStockReportHandler: Symbol.for('GetLowStockReportHandler'),
};

export default types;
