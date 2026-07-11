import commonTypes from '@src/app/core/config/commonTypes';

const types = {
  ...commonTypes,
  PromotionRepository: Symbol.for('PromotionRepository'),
  PromotionAuthorizationPolicy: Symbol.for('PromotionAuthorizationPolicy'),
  PromotionClock: Symbol.for('PromotionClock'),
  PromotionIdGenerator: Symbol.for('PromotionIdGenerator'),
  CreatePromotionHandler: Symbol.for('CreatePromotionHandler'),
  UpdatePromotionHandler: Symbol.for('UpdatePromotionHandler'),
  DeactivatePromotionHandler: Symbol.for('DeactivatePromotionHandler'),
  ListPromotionsHandler: Symbol.for('ListPromotionsHandler'),
  ListActivePromotionsHandler: Symbol.for('ListActivePromotionsHandler'),
  EvaluatePromotionsHandler: Symbol.for('EvaluatePromotionsHandler'),
};

export default types;
