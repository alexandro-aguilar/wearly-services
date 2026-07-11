output "api_invoke_url" {
  description = "Base URL for the protected Wearly API."
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "cognito_user_pool_id" {
  description = "Cognito user pool ID used by the API."
  value       = aws_cognito_user_pool.api.id
}

output "cognito_user_pool_client_id" {
  description = "Cognito application client ID accepted by the API."
  value       = aws_cognito_user_pool_client.api.id
}

output "cognito_issuer" {
  description = "Issuer configured for API Gateway and Lambda JWT verification."
  value       = local.cognito_issuer
}

output "cognito_jwks_url" {
  description = "JWKS URL consumed by the Lambda verifier."
  value       = "${local.cognito_issuer}/.well-known/jwks.json"
}
