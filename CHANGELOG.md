# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-20

### Added
- Initial release of serverless OIDC provider
- API Gateway REST API with OIDC endpoints
- Lambda functions for all OIDC endpoints:
  - `/.well-known/openid-configuration` - OIDC discovery
  - `/jwks` - JSON Web Key Set
  - `/auth` - Authorization endpoint
  - `/token` - Token endpoint
  - `/userinfo` - UserInfo endpoint
- DynamoDB tables for data storage:
  - Users table with username index
  - OAuth clients table
  - Authorization codes table with TTL
  - Refresh tokens table with TTL
- S3 bucket for static assets
- Secrets Manager for JWT signing keys
- IAM roles and policies with least privilege
- Authorization Code Flow with PKCE support
- RS256 JWT signing with 2048-bit RSA keys
- Access tokens, ID tokens, and refresh tokens
- User authentication with SHA-256 password hashing
- OAuth 2.0 client validation
- Standard OIDC scopes (openid, profile, email)
- CORS support for all endpoints
- CloudWatch logging for API Gateway
- Setup script for Lambda dependencies
- Seed data script for demo users and clients
- Comprehensive documentation:
  - README with quick start guide
  - ARCHITECTURE.md with system diagrams
  - TESTING.md with testing instructions
  - CONTRIBUTING.md with contribution guidelines
- Example client applications:
  - Node.js client using openid-client
  - Python client using authlib
- Terraform configuration for infrastructure as code
- Environment-based configuration with variables
- Complete outputs for all important resources

### Security
- Encryption at rest for DynamoDB tables
- Server-side encryption for S3 bucket
- Secrets Manager for secure key storage
- PKCE support for public clients
- Secure password hashing (SHA-256)
- Token expiration (1 hour for access/ID tokens, 30 days for refresh)
- Authorization code expiration (10 minutes)

## [Unreleased]

### Fixed
- Fixed Lambda "Cannot find module 'jsonwebtoken'" error by including node_modules in deployment package
  - Removed node_modules from archive_file excludes in lambda.tf
  - Lambda deployment package now includes all required npm dependencies
  - Users must run `./scripts/setup.sh` before `terraform apply` to install dependencies

### Planned Features
- User registration endpoint
- Consent screen for authorization
- Support for client credentials grant
- Support for implicit grant
- Token rotation and key rotation
- Rate limiting
- Admin API for user/client management
- Multi-factor authentication
- Custom claims support
- Session management
- Better password hashing (bcrypt/Argon2)
- Custom domain support
- WAF integration
- Enhanced monitoring and alerting

### Planned Improvements
- Unit tests for Lambda functions
- Integration tests
- CI/CD pipeline
- Automated security scanning
- Performance optimization
- Better error messages
- Enhanced logging
- Metrics and dashboards
