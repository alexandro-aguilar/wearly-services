provider "aws" {
  region                      = var.aws_region
  access_key                  = var.use_localstack ? "test" : null
  secret_key                  = var.use_localstack ? "test" : null
  skip_credentials_validation = var.use_localstack
  skip_metadata_api_check     = var.use_localstack
  skip_requesting_account_id  = var.use_localstack

  endpoints {
    apigatewayv2 = var.use_localstack ? var.localstack_endpoint : null
    cognitoidp   = var.use_localstack ? var.localstack_endpoint : null
    iam          = var.use_localstack ? var.localstack_endpoint : null
    lambda       = var.use_localstack ? var.localstack_endpoint : null
    logs         = var.use_localstack ? var.localstack_endpoint : null
  }

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "terraform"
      Project     = var.project_name
    }
  }
}
