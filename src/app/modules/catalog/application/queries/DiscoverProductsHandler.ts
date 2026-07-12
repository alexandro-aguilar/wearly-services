import { ProductDiscoveryResultDto } from '@src/app/modules/catalog/application/dtos/ProductDiscoveryDto';
import {
  CatalogDiscoveryReadRepository,
  ProductDiscoveryFilter,
} from '@src/app/modules/catalog/application/ports/CatalogRepositories';
import { CatalogAuthorizationPolicy } from '@src/app/modules/catalog/application/ports/CatalogServices';
import { authorizeCatalogRead } from '@src/app/modules/catalog/application/shared/CatalogGuards';
import { AuthenticatedPrincipal } from '@src/shared/application/auth/AuthenticatedPrincipal';
import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export class DiscoverProductsHandler {
  constructor(
    private readonly discovery: CatalogDiscoveryReadRepository,
    private readonly authorization: CatalogAuthorizationPolicy
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    filter: ProductDiscoveryFilter = {}
  ): Promise<ProductDiscoveryResultDto> {
    authorizeCatalogRead(this.authorization, principal);
    return this.discovery.discoverProducts(principal.storeId, normalizePage(filter));
  }
}

function normalizePage(
  filter: ProductDiscoveryFilter
): Required<Pick<ProductDiscoveryFilter, 'page' | 'pageSize'>> & ProductDiscoveryFilter {
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 25;
  if (!Number.isInteger(page) || page < 1) {
    throw new ValidationError('page must be a positive integer.');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new ValidationError('pageSize must be an integer between 1 and 100.');
  }
  return { ...filter, page, pageSize };
}
