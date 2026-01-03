const {
  getApplicationById,
  getClientById,
  createApplication,
  updateApplication,
  createResponse,
  createErrorResponse
} = require('./utils');

/**
 * Lambda function for application management operations
 * Can be invoked from AWS Console with test payloads
 * 
 * Supported operations:
 * 1. createApplication - Create a new application
 * 2. updateApplication - Update an existing application
 * 
 * Example test payloads:
 * 
 * Create Application (with auto-generated ID):
 * {
 *   "operation": "createApplication",
 *   "client_id": "my-app-client",
 *   "name": "Production Environment",
 *   "description": "Production application instance",
 *   "account": "prod-account-123"
 * }
 * 
 * Create Application (with specific ID):
 * {
 *   "operation": "createApplication",
 *   "application_id": "my-app-prod",
 *   "client_id": "my-app-client",
 *   "name": "Production Environment",
 *   "description": "Production application instance",
 *   "account": "prod-account-123"
 * }
 * 
 * Update Application:
 * {
 *   "operation": "updateApplication",
 *   "application_id": "my-app-prod",
 *   "name": "Production Environment - Updated",
 *   "description": "Updated production application",
 *   "account": "new-prod-account-456"
 * }
 */
exports.handler = async (event) => {
  try {
    console.log('Application management operation requested:', JSON.stringify(event, null, 2));
    
    const { operation } = event;
    
    if (!operation) {
      return createErrorResponse('invalid_request', 'Missing operation parameter. Valid operations: createApplication, updateApplication');
    }
    
    switch (operation) {
      case 'createApplication':
        return await handleCreateApplication(event);
      
      case 'updateApplication':
        return await handleUpdateApplication(event);
      
      default:
        return createErrorResponse('invalid_request', `Unknown operation: ${operation}. Valid operations: createApplication, updateApplication`);
    }
    
  } catch (error) {
    console.error('Error in application management handler:', error);
    return createErrorResponse('server_error', `Internal server error: ${error.message}`, 500);
  }
};

/**
 * Handle createApplication operation
 */
async function handleCreateApplication(event) {
  const { application_id, client_id, name, description, account } = event;
  
  // Validate required parameters
  if (!client_id || !name) {
    return createErrorResponse('invalid_request', 'Missing required parameters: client_id and name are required');
  }
  
  // Validate application_id format if provided (alphanumeric, dash, underscore only)
  if (application_id && !/^[a-zA-Z0-9_-]{3,100}$/.test(application_id)) {
    return createErrorResponse('invalid_request', 'Invalid application_id format. Must be 3-100 characters and contain only letters, numbers, dashes, and underscores');
  }
  
  // Validate client_id exists
  const existingClient = await getClientById(client_id);
  if (!existingClient) {
    return createErrorResponse('invalid_request', 'Client ID not found. Please create the client first');
  }
  
  // Check if application_id already exists (if provided)
  if (application_id) {
    const existingApplication = await getApplicationById(application_id);
    if (existingApplication) {
      return createErrorResponse('invalid_request', 'Application ID already exists');
    }
  }
  
  // Create the application
  const application = await createApplication(
    application_id || null, // Will auto-generate if null
    client_id,
    name,
    description || '',
    account || ''
  );
  
  return createResponse(200, {
    message: 'Application created successfully',
    application: application
  });
}

/**
 * Handle updateApplication operation
 */
async function handleUpdateApplication(event) {
  const { application_id, ...updates } = event;
  
  // Remove operation from updates
  delete updates.operation;
  
  // Validate required parameters
  if (!application_id) {
    return createErrorResponse('invalid_request', 'Missing required parameter: application_id');
  }
  
  // Check if there are any updates
  if (Object.keys(updates).length === 0) {
    return createErrorResponse('invalid_request', 'No update parameters provided');
  }
  
  // Validate client_id exists if updating it
  if (updates.client_id) {
    const existingClient = await getClientById(updates.client_id);
    if (!existingClient) {
      return createErrorResponse('invalid_request', 'Client ID not found. Cannot update to non-existent client');
    }
  }
  
  // Get existing application
  const existingApplication = await getApplicationById(application_id);
  if (!existingApplication) {
    return createErrorResponse('invalid_request', 'Application not found');
  }
  
  // Update the application
  const updatedApplication = await updateApplication(application_id, updates);
  
  return createResponse(200, {
    message: 'Application updated successfully',
    application: updatedApplication
  });
}
