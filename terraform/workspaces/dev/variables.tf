variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "dev"

  validation {
    condition     = var.environment == "dev"
    error_message = "The dev workspace must use environment = dev."
  }
}

variable "project_name" {
  type    = string
  default = "wearly-services"
}

variable "use_localstack" {
  type    = bool
  default = false
}

variable "localstack_endpoint" {
  type    = string
  default = "http://localhost:4566"
}

variable "cognito_issuer_override" {
  type     = string
  default  = null
  nullable = true
}

variable "lambda_memory_size" {
  type    = number
  default = 512
}

variable "lambda_timeout_seconds" {
  type    = number
  default = 15
}

variable "database_secret_arn" {
  type      = string
  default   = null
  nullable  = true
  sensitive = true
}

variable "checkout_persistence_mode" {
  type    = string
  default = "memory"

  validation {
    condition     = contains(["memory", "drizzle"], var.checkout_persistence_mode)
    error_message = "checkout_persistence_mode must be memory or drizzle."
  }
}
