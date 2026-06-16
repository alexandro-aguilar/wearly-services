# Terraform Development Commands

# Usage: npm run <command>

## Development Workflow

```bash
# 1. Start LocalStack
docker-compose up

# 2. Build and deploy to local
yarn deploy:local

# 3. Test your changes
curl $(yarn tf:output -raw stage_invoke_url)example

# 4. Make changes and redeploy
yarn deploy:local
```

## Environment-Specific Deployments

### Local Development (LocalStack)

```bash
yarn deploy:local     # Build + init + apply
yarn teardown:local   # Destroy local infrastructure
```

### Development Environment (AWS)

```bash
yarn deploy:dev       # Build + init + plan + apply
yarn teardown:dev     # Destroy dev infrastructure
```

### Production Environment (AWS)

```bash
yarn deploy:prod      # Build + init + plan + apply (manual approval)
yarn teardown:prod    # Destroy prod infrastructure (manual approval)
```

## Individual Terraform Operations

### Initialization

```bash
yarn tf:init          # Standard init
yarn tf:init:local    # Init with reconfigure for LocalStack
```

### Planning

```bash
yarn tf:plan:local    # Plan for local environment
yarn tf:plan:dev      # Plan for dev environment
yarn tf:plan:prod     # Plan for prod environment
```

### Applying

```bash
yarn tf:apply:local   # Apply to local (auto-approve)
yarn tf:apply:dev     # Apply to dev (manual approval)
yarn tf:apply:prod    # Apply to prod (manual approval)
```

### Utilities

```bash
yarn tf:fmt           # Format Terraform files
yarn tf:validate      # Validate configuration
yarn tf:output        # Show outputs
yarn tf:state:list    # List state resources
yarn check:terraform  # Format + validate
```

## Advanced Operations

### Workspace Management

```bash
yarn workspace:new <name>     # Create new workspace
yarn workspace:select <name>  # Switch workspace
yarn workspace:list           # List workspaces
```

### State Management

```bash
yarn tf:state:list            # List all resources in state
yarn tf:state:show <resource> # Show specific resource details
yarn tf:refresh              # Refresh state
```

## Troubleshooting

### Common Issues

1. **Build fails**: Check TypeScript compilation errors
2. **LocalStack not responding**: Restart Docker Compose
3. **State locked**: Wait for concurrent operations to complete
4. **Module not found**: Run `yarn tf:init` first

### Debug Commands

```bash
# Check Terraform version
terraform version

# Validate configuration
yarn tf:validate

# Show detailed plan
yarn tf:plan:local

# Check provider configuration
terraform providers
```
