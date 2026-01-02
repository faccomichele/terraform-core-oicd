const {
  getUserByUsername,
  createUser,
  updateUserPassword,
  createResponse,
  createErrorResponse
} = require('./utils');

/**
 * Lambda function for user management operations
 * Can be invoked from AWS Console with test payloads
 * 
 * Supported operations:
 * 1. createUser - Create a new user
 * 2. resetPassword - Reset a user's password
 * 
 * Example test payloads:
 * 
 * Create User:
 * {
 *   "operation": "createUser",
 *   "username": "newuser",
 *   "password": "SecurePassword123!",
 *   "email": "newuser@example.com",
 *   "profile": {
 *     "name": "New User",
 *     "given_name": "New",
 *     "family_name": "User"
 *   }
 * }
 * 
 * Reset Password:
 * {
 *   "operation": "resetPassword",
 *   "username": "existinguser",
 *   "newPassword": "NewSecurePassword123!"
 * }
 */
exports.handler = async (event) => {
  try {
    console.log('User management operation requested:', JSON.stringify(event, null, 2));
    
    const { operation } = event;
    
    if (!operation) {
      return createErrorResponse('invalid_request', 'Missing operation parameter. Valid operations: createUser, resetPassword');
    }
    
    switch (operation) {
      case 'createUser':
        return await handleCreateUser(event);
      
      case 'resetPassword':
        return await handleResetPassword(event);
      
      default:
        return createErrorResponse('invalid_request', `Unknown operation: ${operation}. Valid operations: createUser, resetPassword`);
    }
    
  } catch (error) {
    console.error('Error in user management handler:', error);
    return createErrorResponse('server_error', `Internal server error: ${error.message}`, 500);
  }
};

/**
 * Handle createUser operation
 */
async function handleCreateUser(event) {
  const { username, password, email, profile } = event;
  
  // Validate required parameters
  if (!username || !password || !email) {
    return createErrorResponse('invalid_request', 'Missing required parameters: username, password, and email are required');
  }
  
  // Validate username format (alphanumeric, dash, underscore only)
  if (!/^[a-zA-Z0-9_-]{3,50}$/.test(username)) {
    return createErrorResponse('invalid_request', 'Invalid username format. Username must be 3-50 characters and contain only letters, numbers, dashes, and underscores');
  }
  
  // Validate email format (basic check)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return createErrorResponse('invalid_request', 'Invalid email format');
  }
  
  // Validate password strength (minimum 8 characters)
  if (password.length < 8) {
    return createErrorResponse('invalid_request', 'Password must be at least 8 characters long');
  }
  
  // Check if username already exists
  const existingUser = await getUserByUsername(username);
  if (existingUser) {
    return createErrorResponse('invalid_request', 'Username already exists');
  }
  
  // Create the user
  const user = await createUser(username, password, email, profile || {});
  
  // Return success response (exclude password_hash)
  const { password_hash, ...userResponse } = user;
  
  return createResponse(200, {
    message: 'User created successfully',
    user: userResponse
  });
}

/**
 * Handle resetPassword operation
 */
async function handleResetPassword(event) {
  const { username, newPassword } = event;
  
  // Validate required parameters
  if (!username || !newPassword) {
    return createErrorResponse('invalid_request', 'Missing required parameters: username and newPassword are required');
  }
  
  // Validate password strength (minimum 8 characters)
  if (newPassword.length < 8) {
    return createErrorResponse('invalid_request', 'Password must be at least 8 characters long');
  }
  
  // Get user by username
  const user = await getUserByUsername(username);
  if (!user) {
    return createErrorResponse('invalid_request', 'User not found');
  }
  
  // Update the password
  await updateUserPassword(user.user_id, newPassword);
  
  return createResponse(200, {
    message: 'Password reset successfully',
    username: username
  });
}
