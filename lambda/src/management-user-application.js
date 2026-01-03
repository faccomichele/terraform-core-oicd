const {
  getUserById,
  getApplicationById,
  getUserApplication,
  createUserApplication,
  updateUserApplication,
  createResponse,
  createErrorResponse
} = require('./utils');

/**
 * Lambda function for user-application configuration management operations
 * Can be invoked from AWS Console with test payloads
 * 
 * Supported operations:
 * 1. createUserApplication - Create a new user-application mapping
 * 2. updateUserApplication - Update an existing user-application mapping
 * 
 * Example test payloads:
 * 
 * Create User-Application Mapping:
 * {
 *   "operation": "createUserApplication",
 *   "user_id": "550e8400-e29b-41d4-a716-446655440000",
 *   "application_id": "my-app-prod",
 *   "account": "user-specific-account-id"
 * }
 * 
 * Update User-Application Mapping:
 * {
 *   "operation": "updateUserApplication",
 *   "user_id": "550e8400-e29b-41d4-a716-446655440000",
 *   "application_id": "my-app-prod",
 *   "account": "updated-account-id"
 * }
 */
exports.handler = async (event) => {
  try {
    console.log('User-application management operation requested:', JSON.stringify(event, null, 2));
    
    const { operation } = event;
    
    if (!operation) {
      return createErrorResponse('invalid_request', 'Missing operation parameter. Valid operations: createUserApplication, updateUserApplication');
    }
    
    switch (operation) {
      case 'createUserApplication':
        return await handleCreateUserApplication(event);
      
      case 'updateUserApplication':
        return await handleUpdateUserApplication(event);
      
      default:
        return createErrorResponse('invalid_request', `Unknown operation: ${operation}. Valid operations: createUserApplication, updateUserApplication`);
    }
    
  } catch (error) {
    console.error('Error in user-application management handler:', error);
    return createErrorResponse('server_error', `Internal server error: ${error.message}`, 500);
  }
};

/**
 * Handle createUserApplication operation
 */
async function handleCreateUserApplication(event) {
  const { user_id, application_id, account } = event;
  
  // Validate required parameters
  if (!user_id || !application_id) {
    return createErrorResponse('invalid_request', 'Missing required parameters: user_id and application_id are required');
  }
  
  // Validate user_id exists
  const existingUser = await getUserById(user_id);
  if (!existingUser) {
    return createErrorResponse('invalid_request', 'User ID not found. Please create the user first');
  }
  
  // Validate application_id exists
  const existingApplication = await getApplicationById(application_id);
  if (!existingApplication) {
    return createErrorResponse('invalid_request', 'Application ID not found. Please create the application first');
  }
  
  // Check if user-application mapping already exists
  const existingUserApplication = await getUserApplication(user_id, application_id);
  if (existingUserApplication) {
    return createErrorResponse('invalid_request', 'User-application mapping already exists. Use updateUserApplication to modify it');
  }
  
  // Create the user-application mapping
  const userApplication = await createUserApplication(
    user_id,
    application_id,
    account || ''
  );
  
  return createResponse(200, {
    message: 'User-application mapping created successfully',
    user_application: userApplication
  });
}

/**
 * Handle updateUserApplication operation
 */
async function handleUpdateUserApplication(event) {
  const { user_id, application_id, ...updates } = event;
  
  // Remove operation from updates
  delete updates.operation;
  
  // Validate required parameters
  if (!user_id || !application_id) {
    return createErrorResponse('invalid_request', 'Missing required parameters: user_id and application_id are required');
  }
  
  // Check if there are any updates
  if (Object.keys(updates).length === 0) {
    return createErrorResponse('invalid_request', 'No update parameters provided');
  }
  
  // Get existing user-application mapping
  const existingUserApplication = await getUserApplication(user_id, application_id);
  if (!existingUserApplication) {
    return createErrorResponse('invalid_request', 'User-application mapping not found. Use createUserApplication to create it first');
  }
  
  // Update the user-application mapping
  const updatedUserApplication = await updateUserApplication(user_id, application_id, updates);
  
  return createResponse(200, {
    message: 'User-application mapping updated successfully',
    user_application: updatedUserApplication
  });
}
