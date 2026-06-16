# dnd-terraform

Infrastructure-as-code sandbox for a serverless app made of multiple AWS Lambda functions behind an API Gateway HTTP API. Lambdas are authored in TypeScript, compiled to `.bin`, and deployed via Terraform either to LocalStack or AWS.

## Dependencies

- Node.js 20+ and Yarn 4 (`corepack enable && yarn set version 4.9.2`).
- Docker + Docker Compose (required for the bundled LocalStack setup).
- LocalStack CLI (or use the provided `docker-compose.yml`).
- Terraform >= 1.5 (`brew install terraform`).
- TFLint (optional but recommended for Terraform linting).
- (Optional) AWS CLI if you want to target a real AWS account.

## Project layout

- `app/`: Lambda source organized by module. Output JS files land in `app/.bin/**/index.js`.
- `esbuild.ts`: Builds/compiles Lambdas into `.bin`.
- `terraform/`: Terraform stack that wires Lambdas, IAM, and API Gateway (see its README for more detail).

## Local development workflow

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Build the Lambdas (writes to `.bin`):

   ```bash
   yarn build
   # or yarn build:local for watch mode
   ```

3. Start LocalStack (Docker-based):

   ```bash
   yarn localstack
   ```

4. Deploy everything into LocalStack via Terraform:

   ```bash
   yarn deploy:local
   ```

   This runs the build, `terraform init`, and `terraform apply -auto-approve` inside `terraform/`.

5. Hit the printed API Gateway endpoint (shown in Terraform outputs) to exercise the Lambdas.

## Terraform linting & validation

Run static checks before committing infrastructure changes:

```bash
tflint terraform
terraform -chdir=terraform fmt -check
terraform -chdir=terraform validate
```

## Targeting AWS instead of LocalStack

1. Sign in with AWS credentials (e.g., `aws sso login`).
2. Copy `terraform/terraform.tfvars.example` to `terraform.tfvars`.
3. Set `use_localstack = false` and adjust any account-specific settings.
4. Run `terraform -chdir=terraform apply`.

## Helpful scripts

| Command             | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `yarn build`        | Compile Lambdas via esbuild.                      |
| `yarn lint`         | Lint TypeScript/Node sources.                     |
| `yarn localstack`   | Restart LocalStack using docker-compose.          |
| `yarn deploy:local` | Build & deploy stack to LocalStack via Terraform. |

See `package.json` for the full list. When in doubt, check `terraform/README.md` for stack-specific instructions.
