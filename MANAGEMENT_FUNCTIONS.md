# Management Lambda Functions - Implementation Summary

## Overview
This implementation adds comprehensive management capabilities for the OIDC provider by creating four management lambda functions that can be invoked from the AWS Console to manage users, OAuth clients, applications, and user-application mappings.

## Changes Made

### 1. Renamed Lambda Function
- **Old name**: `user-management` (file: `user-management.js`)
- **New name**: `management-user` (file: `management-user.js`)
- Updated Terraform resource name from `aws_lambda_function.user_management` to `aws_lambda_function.management_user`
- Updated function name template from `${local.project_name}-${local.environment}-user-management` to `${local.project_name}-${local.environment}-management-user`
- Updated handler from `user-management.handler` to `management-user.handler`

### 2. New Lambda Functions Added

#### management-client
Manages OAuth client operations:
- **Create Client**: Create new OAuth clients with redirect URIs
- **Update Client**: Update existing client configurations

**File**: `lambda/src/management-client.js`
**Handler**: `management-client.handler`
**Operations**: `createClient`, `updateClient`

#### management-application
Manages application operations:
- **Create Application**: Create new applications (with or without specific IDs)
- **Update Application**: Update existing application configurations

**File**: `lambda/src/management-application.js`
**Handler**: `management-application.handler`
**Operations**: `createApplication`, `updateApplication`

#### management-user-application
Manages user-application configuration mappings:
- **Create User-Application Mapping**: Link users to applications
- **Update User-Application Mapping**: Update existing user-application configurations

**File**: `lambda/src/management-user-application.js`
**Handler**: `management-user-application.handler`
**Operations**: `createUserApplication`, `updateUserApplication`

### 3. Updated Utils Module
Enhanced `lambda/src/utils.js` with new helper functions:

#### New Exports:
- `createClient(clientId, clientSecret, redirectUris, name, description)`
- `updateClient(clientId, updates)`
- `getApplicationById(applicationId)`
- `createApplication(applicationId, clientId, name, description, account)`
- `updateApplication(applicationId, updates)`
- `getUserApplication(userId, applicationId)`
- `createUserApplication(userId, applicationId, account)`
- `updateUserApplication(userId, applicationId, updates)`
- `putItem(tableName, item)` - Made public for reuse
- `getItem(tableName, key)` - Made public for reuse

#### Updated TABLES Constant:
Added support for:
- `applications`: `process.env.APPLICATIONS_TABLE`
- `userApplications`: `process.env.USER_APPLICATIONS_TABLE`

### 4. Terraform Configuration Updates

#### Updated Environment Variables
All management lambda functions now include:
```hcl
APPLICATIONS_TABLE       = aws_dynamodb_table.applications.name
USER_APPLICATIONS_TABLE  = aws_dynamodb_table.user_applications.name
```

#### New Lambda Resources in `lambda.tf`:
1. `aws_lambda_function.management_user` (renamed from `user_management`)
2. `aws_lambda_function.management_client` (new)
3. `aws_lambda_function.management_application` (new)
4. `aws_lambda_function.management_user_application` (new)

### 5. Test Input Files
Created comprehensive test JSON files in `lambda/test-inputs/`:

#### For management-user:
- `management-user-create.json` - Create a new user
- `management-user-reset-password.json` - Reset user password

#### For management-client:
- `management-client-create.json` - Create a new OAuth client
- `management-client-update.json` - Update an OAuth client

#### For management-application:
- `management-application-create.json` - Create application (auto-generated ID)
- `management-application-create-with-id.json` - Create application (specific ID)
- `management-application-update.json` - Update an application

#### For management-user-application:
- `management-user-application-create.json` - Create user-application mapping
- `management-user-application-update.json` - Update user-application mapping

### 6. Documentation
Created `lambda/test-inputs/README.md` with:
- Usage instructions for AWS Console testing
- Complete operation examples
- Field validation rules
- Response format documentation
- Recommended workflow order

## Key Features

### Security & Validation
All management functions include:
- Input validation (required fields, format checks)
- Foreign key validation (e.g., client_id must exist before creating application)
- Password strength requirements (for user management)
- URL validation for redirect URIs
- ID format validation (alphanumeric, dash, underscore only)

### Error Handling
- Consistent error response format
- Detailed error messages for debugging
- Proper HTTP status codes
- Comprehensive logging

### Flexibility
- Optional fields where appropriate (description, account)
- Auto-generation of IDs when not specified (applications)
- Support for both create and update operations
- No deletion operations (as per requirements)

## Usage Workflow

### Complete Setup Example:

1. **Create a User**
   ```bash
   Use: management-user-create.json
   Returns: user_id
   ```

2. **Create an OAuth Client**
   ```bash
   Use: management-client-create.json
   Returns: client_id
   ```

3. **Create an Application**
   ```bash
   Use: management-application-create.json
   Requires: client_id from step 2
   Returns: application_id
   ```

4. **Map User to Application**
   ```bash
   Use: management-user-application-create.json
   Requires: user_id from step 1, application_id from step 3
   ```

## Testing in AWS Console

1. Navigate to Lambda service in AWS Console
2. Select the desired management function
3. Go to the "Test" tab
4. Create a new test event or modify existing
5. Copy content from appropriate test JSON file
6. Adjust values as needed (especially IDs for update operations)
7. Click "Test" to invoke the function
8. Review the response in the execution results

## Database Schema Support

The implementation supports the existing DynamoDB tables:
- **users**: user_id (PK), username (GSI)
- **clients**: client_id (PK)
- **applications**: application_id (PK), client_id (GSI)
- **user_applications**: user_id (PK), application_id (SK)

## Notes

- All management functions are designed for console invocation only (no API Gateway integration)
- Functions follow the existing codebase patterns and conventions
- All operations create or update records; no deletion functionality
- Response format matches existing OIDC endpoints for consistency
- Environment variables are properly configured in Terraform for all functions
