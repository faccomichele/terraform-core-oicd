# Lambda Management Functions - Test Inputs

This directory contains test JSON inputs for the management lambda functions. These files can be used directly in the AWS Console to test the lambda functions.

## Management Functions

### 1. management-user

Manages user operations including creating users and resetting passwords.

**Test Files:**
- `management-user-create.json` - Create a new user
- `management-user-reset-password.json` - Reset a user's password

**Example Usage in AWS Console:**
1. Navigate to Lambda in AWS Console
2. Select the `management-user` function
3. Go to the "Test" tab
4. Create a new test event or select an existing one
5. Copy the content from one of the test files above
6. Click "Test" to invoke the function

### 2. management-client

Manages OAuth client operations including creating and updating clients.

**Test Files:**
- `management-client-create.json` - Create a new OAuth client
- `management-client-update.json` - Update an existing OAuth client

**Example Usage in AWS Console:**
1. Navigate to Lambda in AWS Console
2. Select the `management-client` function
3. Go to the "Test" tab
4. Copy the content from one of the test files above
5. Click "Test" to invoke the function

### 3. management-application

Manages application operations including creating and updating applications.

**Test Files:**
- `management-application-create.json` - Create an application with auto-generated ID
- `management-application-create-with-id.json` - Create an application with specific ID
- `management-application-update.json` - Update an existing application

**Example Usage in AWS Console:**
1. Navigate to Lambda in AWS Console
2. Select the `management-application` function
3. Go to the "Test" tab
4. Copy the content from one of the test files above
5. Click "Test" to invoke the function

### 4. management-user-application

Manages user-application configuration mappings.

**Test Files:**
- `management-user-application-create.json` - Create a user-application mapping
- `management-user-application-update.json` - Update a user-application mapping

**Important Notes:**
- Before creating a user-application mapping, ensure both the user and application exist
- The `user_id` in the examples is a placeholder UUID - replace with actual user IDs from your users table
- The `application_id` should match an existing application ID

**Example Usage in AWS Console:**
1. Navigate to Lambda in AWS Console
2. Select the `management-user-application` function
3. Go to the "Test" tab
4. Copy the content from one of the test files above
5. **Update the `user_id` with an actual user ID from your users table**
6. Click "Test" to invoke the function

## Order of Operations

For a complete setup workflow, follow this order:

1. **Create a user** using `management-user-create.json`
2. **Create a client** using `management-client-create.json`
3. **Create an application** using `management-application-create.json` or `management-application-create-with-id.json`
4. **Map the user to the application** using `management-user-application-create.json` (remember to use the actual user_id from step 1)

## Response Format

All management functions return a JSON response with the following structure:

**Success Response:**
```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  },
  "body": "{\"message\":\"...\",\"...\":\"...\"}"
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  },
  "body": "{\"error\":\"invalid_request\",\"error_description\":\"...\"}"
}
```

## Password Requirements (for management-user)

When creating or resetting user passwords, the following requirements must be met:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*(),.?":{}|<>-_+=~[]\\)

## Field Validations

### Client ID
- 3-100 characters
- Only letters, numbers, dashes, and underscores

### Username
- 3-50 characters
- Only letters, numbers, dashes, and underscores

### Application ID (when specified)
- 3-100 characters
- Only letters, numbers, dashes, and underscores

### Redirect URIs
- Must be valid URLs
- Must use HTTP or HTTPS protocol
- Must be provided as an array with at least one URI
