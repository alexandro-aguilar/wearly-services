terraform {
  backend "s3" {
    key                  = "wearly-services.tfstate"
    encrypt              = true
    workspace_key_prefix = "workspaces"
    use_lockfile         = true
  }
}
