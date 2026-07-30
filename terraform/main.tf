locals {
  name_prefix = "${var.project_name}-${var.environment}"

  cognito_issuer = coalesce(
    var.cognito_issuer_override,
    var.use_localstack ? "http://cognito-idp.${var.aws_region}.localhost.localstack.cloud:4566/${aws_cognito_user_pool.api.id}" : "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.api.id}"
  )
  database_secret = var.database_secret_arn == null ? {} : jsondecode(data.aws_secretsmanager_secret_version.database[0].secret_string)

  lambdas = {
    create_product           = { handler = "CreateProductEndpointHandler" }
    create_variant           = { handler = "CreateProductVariantEndpointHandler" }
    deactivate_product       = { handler = "DeactivateProductEndpointHandler" }
    deactivate_variant       = { handler = "DeactivateProductVariantEndpointHandler" }
    get_product              = { handler = "GetProductByIdEndpointHandler" }
    get_variant              = { handler = "GetProductVariantByIdEndpointHandler" }
    list_products            = { handler = "ListProductsEndpointHandler" }
    list_variants            = { handler = "ListProductVariantsEndpointHandler" }
    update_product           = { handler = "UpdateProductEndpointHandler" }
    update_variant           = { handler = "UpdateProductVariantEndpointHandler" }
    create_customer          = { handler = "CreateCustomerEndpointHandler" }
    customer_sales_history   = { handler = "GetCustomerSalesHistoryEndpointHandler" }
    list_customers           = { handler = "ListCustomersEndpointHandler" }
    update_customer          = { handler = "UpdateCustomerEndpointHandler" }
    adjust_inventory         = { handler = "AdjustInventoryEndpointHandler" }
    get_inventory            = { handler = "GetInventoryEndpointHandler" }
    list_inventory_movements = { handler = "ListInventoryMovementsEndpointHandler" }
    create_promotion         = { handler = "CreatePromotionEndpointHandler" }
    list_promotions          = { handler = "ListPromotionsEndpointHandler" }
    update_promotion         = { handler = "UpdatePromotionEndpointHandler" }
    best_sellers_report      = { handler = "GetBestSellersReportEndpointHandler" }
    daily_sales_report       = { handler = "GetDailySalesReportEndpointHandler" }
    sales_overview_report    = { handler = "GetSalesOverviewReportEndpointHandler" }
    low_stock_report         = { handler = "GetLowStockReportEndpointHandler" }
    complete_sale            = { handler = "CompleteSaleEndpointHandler" }
    complete_quote_sale      = { handler = "CompleteQuoteSaleEndpointHandler" }
    get_sale_idempotency     = { handler = "GetSaleIdempotencyEndpointHandler" }
    get_session              = { handler = "GetSessionEndpointHandler" }
    select_session_store     = { handler = "SelectSessionStoreEndpointHandler" }
    create_checkout_quote    = { handler = "CreateCheckoutQuoteEndpointHandler" }
    get_sale                 = { handler = "GetSaleByIdEndpointHandler" }
    list_sales               = { handler = "ListSalesEndpointHandler" }
  }

  routes = {
    "GET /api/v1/products"                = "list_products"
    "POST /api/v1/products"               = "create_product"
    "GET /api/v1/products/{id}"           = "get_product"
    "PATCH /api/v1/products/{id}"         = "update_product"
    "DELETE /api/v1/products/{id}"        = "deactivate_product"
    "GET /api/v1/variants"                = "list_variants"
    "POST /api/v1/variants"               = "create_variant"
    "GET /api/v1/variants/{id}"           = "get_variant"
    "PATCH /api/v1/variants/{id}"         = "update_variant"
    "DELETE /api/v1/variants/{id}"        = "deactivate_variant"
    "GET /api/v1/customers"               = "list_customers"
    "POST /api/v1/customers"              = "create_customer"
    "PATCH /api/v1/customers/{id}"        = "update_customer"
    "GET /api/v1/customers/{id}/sales"    = "customer_sales_history"
    "GET /api/v1/inventory"               = "get_inventory"
    "POST /api/v1/inventory/adjustments"  = "adjust_inventory"
    "GET /api/v1/inventory/movements"     = "list_inventory_movements"
    "GET /api/v1/promotions"              = "list_promotions"
    "POST /api/v1/promotions"             = "create_promotion"
    "PATCH /api/v1/promotions/{id}"       = "update_promotion"
    "GET /api/v1/reports/best-sellers"    = "best_sellers_report"
    "GET /api/v1/reports/daily-sales"     = "daily_sales_report"
    "GET /api/v1/reports/sales-overview"  = "sales_overview_report"
    "GET /api/v1/reports/low-stock"       = "low_stock_report"
    "GET /api/v1/sales"                   = "list_sales"
    "POST /api/v1/sales"                  = "complete_quote_sale"
    "GET /api/v1/sales/idempotency/{key}" = "get_sale_idempotency"
    "GET /api/v1/session"                 = "get_session"
    "POST /api/v1/session/store"          = "select_session_store"
    "POST /api/v1/checkout/quote"         = "create_checkout_quote"
    "GET /api/v1/sales/{id}"              = "get_sale"
  }
}

data "aws_secretsmanager_secret_version" "database" {
  count     = var.database_secret_arn == null ? 0 : 1
  secret_id = var.database_secret_arn
}

resource "aws_cognito_user_pool" "api" {
  name                     = "${local.name_prefix}-users"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "store_id"
    required                 = false

    string_attribute_constraints {
      min_length = 1
      max_length = 128
    }
  }
}

resource "aws_cognito_user_pool_client" "api" {
  name                          = "${local.name_prefix}-api"
  user_pool_id                  = aws_cognito_user_pool.api.id
  generate_secret               = false
  explicit_auth_flows           = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true
  access_token_validity         = 60
  id_token_validity             = 60

  token_validity_units {
    access_token = "minutes"
    id_token     = "minutes"
  }
}

resource "aws_cognito_user_group" "roles" {
  for_each = toset(["ADMIN", "MANAGER", "CASHIER"])

  name         = each.value
  user_pool_id = aws_cognito_user_pool.api.id
  precedence   = each.value == "ADMIN" ? 1 : each.value == "MANAGER" ? 2 : 3
}

resource "aws_iam_role" "lambda" {
  name = "${local.name_prefix}-api-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_logs" {
  name = "${local.name_prefix}-lambda-logs"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "*"
    }]
  })
}

data "archive_file" "lambda" {
  for_each = local.lambdas

  type        = "zip"
  source_file = "${path.module}/../.dist/${each.value.handler}.js"
  output_path = "${path.module}/.build/${each.key}.zip"
}

resource "aws_cloudwatch_log_group" "lambda" {
  for_each = local.lambdas

  name              = "/aws/lambda/${local.name_prefix}-${each.key}"
  retention_in_days = 30
}

resource "aws_lambda_function" "api" {
  for_each = local.lambdas

  function_name    = "${local.name_prefix}-${each.key}"
  role             = aws_iam_role.lambda.arn
  handler          = "${each.value.handler}.handler"
  runtime          = "nodejs24.x"
  filename         = data.archive_file.lambda[each.key].output_path
  source_code_hash = data.archive_file.lambda[each.key].output_base64sha256
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout_seconds

  environment {
    variables = merge({
      COGNITO_ISSUER              = local.cognito_issuer
      COGNITO_USER_POOL_CLIENT_ID = aws_cognito_user_pool_client.api.id
      POWERTOOLS_SERVICE_NAME     = local.name_prefix
      STAGE                       = var.environment
      CHECKOUT_PERSISTENCE        = var.checkout_persistence_mode
      }, var.database_secret_arn == null ? {} : {
      DB_HOST     = local.database_secret.DB_HOST
      DB_PORT     = local.database_secret.DB_PORT
      DB_USER     = local.database_secret.DB_USER
      DB_PASSWORD = local.database_secret.DB_PASSWORD
      DB_NAME     = local.database_secret.DB_NAME
    })
  }

  depends_on = [aws_iam_role_policy.lambda_logs, aws_cloudwatch_log_group.lambda]
}

resource "aws_apigatewayv2_api" "http" {
  name          = "${local.name_prefix}-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.http.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${local.name_prefix}-cognito"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.api.id]
    issuer   = local.cognito_issuer
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  for_each = local.lambdas

  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api[each.key].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "api" {
  for_each = local.routes

  api_id             = aws_apigatewayv2_api.http.id
  route_key          = each.key
  target             = "integrations/${aws_apigatewayv2_integration.lambda[each.value].id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_lambda_permission" "api_gateway" {
  for_each = local.lambdas

  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*"
  statement_id  = "AllowApiGateway${replace(title(each.key), "_", "")}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}
