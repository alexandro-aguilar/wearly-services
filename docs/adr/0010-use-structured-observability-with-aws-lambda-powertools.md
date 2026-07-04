# 0010 - Use Structured Observability With AWS Lambda Powertools

## Status

Accepted

## Context

Wearly needs clear production diagnostics for checkout, inventory, promotions, reports, and auth. The handoff requires structured logging, AWS Lambda Powertools, metrics, tracing, and request correlation IDs.

The existing graph identifies logger, tracer, and metrics services as important infrastructure concepts.

## Decision

Use structured observability with AWS Lambda Powertools for Lambda-hosted Wearly services.

Include correlation IDs in request handling and propagate useful operational context through logs, metrics, and traces.

## Consequences

- Logs should include correlation ID, route or command name, store ID when available, and handled error codes.
- Logs must not include secrets, bearer tokens, payment card data, or sensitive customer data.
- Metrics should include request count, latency, errors, checkout completions and failures, promotion applications, and inventory adjustments.
- Traces should cover request handling, command/query execution, repository calls, transaction boundaries, and AWS service calls.

