const {
  getClientById,
  createClient,
  updateClient,
  createResponse,
  createErrorResponse
} = require('./utils');

/**
 * Lambda function for client management operations
 * Can be invoked from AWS Console with test payloads
 * 
 * Supported operations:
 * 1. createClient - Create a new OAuth client
 * 2. updateClient - Update an existing OAuth client
 * 
 * Example test payloads:
 * 
 * Create Client:
 * {
 *   "operation": "createClient",
 *   "client_id": "my-app-client",
 *   "client_secret": "my-secure-secret-123",
 *   "redirect_uris": ["https://myapp.example.com/callback"],
 *   "name": "My Application",
 *   "description": "My awesome application"
 * }
 * 
 * Update Client:
 * {
 *   "operation": "updateClient",
 *   "client_id": "my-app-client",
 *   "redirect_uris": ["https://myapp.example.com/callback", "https://myapp.example.com/auth/callback"],
 *   "name": "My Updated Application",
 *   "description": "Updated description"
 * }
 */
exports.handler = async (event) => {
  try {
    console.log('Client management operation requested:', JSON.stringify(event, null, 2));
    
    const { operation } = event;
    
    if (!operation) {
      return createErrorResponse('invalid_request', 'Missing operation parameter. Valid operations: createClient, updateClient');
    }
    
    switch (operation) {
      case 'createClient':
        return await handleCreateClient(event);
      
      case 'updateClient':
        return await handleUpdateClient(event);
      
      default:
        return createErrorResponse('invalid_request', `Unknown operation: ${operation}. Valid operations: createClient, updateClient`);
    }
    
  } catch (error) {
    console.error('Error in client management handler:', error);
    return createErrorResponse('server_error', `Internal server error: ${error.message}`, 500);
  }
};

/**
 * Handle createClient operation
 */
async function handleCreateClient(event) {
  const { client_id, client_secret, redirect_uris, name, description } = event;
  
  // Validate required parameters
  if (!client_id || !client_secret || !redirect_uris || !name) {
    return createErrorResponse('invalid_request', 'Missing required parameters: client_id, client_secret, redirect_uris, and name are required');
  }
  
  // Validate client_id format (alphanumeric, dash, underscore only)
  if (!/^[a-zA-Z0-9_-]{3,100}$/.test(client_id)) {
    return createErrorResponse('invalid_request', 'Invalid client_id format. Must be 3-100 characters and contain only letters, numbers, dashes, and underscores');
  }
  
  // Validate redirect_uris is an array
  if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    return createErrorResponse('invalid_request', 'redirect_uris must be a non-empty array of URLs');
  }
  
  // Validate each redirect URI
  for (const uri of redirect_uris) {
    try {
      const url = new URL(uri);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return createErrorResponse('invalid_request', `Invalid redirect URI protocol: ${uri}. Must use http or https`);
      }
    } catch (error) {
      return createErrorResponse('invalid_request', `Invalid redirect URI format: ${uri}`);
    }
  }
  
  // Check if client_id already exists
  const existingClient = await getClientById(client_id);
  if (existingClient) {
    return createErrorResponse('invalid_request', 'Client ID already exists');
  }
  
  // Create the client
  const client = await createClient(client_id, client_secret, redirect_uris, name, description || '');
  
  return createResponse(200, {
    message: 'Client created successfully',
    client: client
  });
}

/**
 * Handle updateClient operation
 */
async function handleUpdateClient(event) {
  const { client_id, ...updates } = event;
  
  // Remove operation from updates
  delete updates.operation;
  
  // Validate required parameters
  if (!client_id) {
    return createErrorResponse('invalid_request', 'Missing required parameter: client_id');
  }
  
  // Check if there are any updates
  if (Object.keys(updates).length === 0) {
    return createErrorResponse('invalid_request', 'No update parameters provided');
  }
  
  // Validate redirect_uris if provided
  if (updates.redirect_uris) {
    if (!Array.isArray(updates.redirect_uris) || updates.redirect_uris.length === 0) {
      return createErrorResponse('invalid_request', 'redirect_uris must be a non-empty array of URLs');
    }
    
    for (const uri of updates.redirect_uris) {
      try {
        const url = new URL(uri);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
          return createErrorResponse('invalid_request', `Invalid redirect URI protocol: ${uri}. Must use http or https`);
        }
      } catch (error) {
        return createErrorResponse('invalid_request', `Invalid redirect URI format: ${uri}`);
      }
    }
  }
  
  // Get existing client
  const existingClient = await getClientById(client_id);
  if (!existingClient) {
    return createErrorResponse('invalid_request', 'Client not found');
  }
  
  // Update the client
  const updatedClient = await updateClient(client_id, updates);
  
  return createResponse(200, {
    message: 'Client updated successfully',
    client: updatedClient
  });
}
