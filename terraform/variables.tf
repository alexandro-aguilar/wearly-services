variable "aws_region" {
  type        = string
  description = "AWS region used for Cognito, Lambda, and API Gateway."
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Deployment environment name."

  validation {
    condition     = contains(["local", "dev", "staging", "prod"], var.environment)
    error_message = "environment must be local, dev, staging, or prod."
  }
}

variable "project_name" {
  type        = string
  description = "Prefix for deployed resource names."
  default     = "wearly-services"
}

variable "use_localstack" {
  type        = bool
  description = "Configures AWS provider endpoints and credentials for LocalStack."
  default     = false
}

variable "localstack_endpoint" {
  type        = string
  description = "LocalStack edge endpoint, used only when use_localstack is true."
  default     = "http://localhost:4566"
}

variable "cognito_issuer_override" {
  type        = string
  description = "Optional issuer override for Cognito-compatible local runtimes."
  default     = null
  nullable    = true
}

variable "lambda_memory_size" {
  type        = number
  description = "Memory allocated to each API Lambda."
  default     = 512
}

variable "lambda_timeout_seconds" {
  type        = number
  description = "Timeout allocated to each API Lambda."
  default     = 15
}
