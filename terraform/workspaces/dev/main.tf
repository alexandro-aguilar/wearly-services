module "wearly" {
  source = "../.."

  aws_region                = var.aws_region
  environment               = var.environment
  project_name              = var.project_name
  use_localstack            = var.use_localstack
  localstack_endpoint       = var.localstack_endpoint
  cognito_issuer_override   = var.cognito_issuer_override
  lambda_memory_size        = var.lambda_memory_size
  lambda_timeout_seconds    = var.lambda_timeout_seconds
  database_secret_arn       = var.database_secret_arn
  checkout_persistence_mode = var.checkout_persistence_mode
}
