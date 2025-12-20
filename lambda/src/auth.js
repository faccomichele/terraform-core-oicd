const {
  validateClient,
  createAuthCode,
  createErrorResponse,
  createHTMLResponse,
  verifyUserPassword
} = require('./utils');
const crypto = require('crypto');

// Simple login page HTML
function getLoginPage(clientId, redirectUri, state, scope, codeChallenge, codeChallengeMethod, error = null) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Login - OIDC Provider</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
    h2 { color: #333; }
    form { background: #f5f5f5; padding: 20px; border-radius: 5px; }
    label { display: block; margin: 10px 0 5px; }
    input { width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 3px; }
    button { width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; }
    button:hover { background: #0056b3; }
    .error { color: red; margin-bottom: 10px; }
    .info { color: #666; margin-top: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <h2>Sign In</h2>
  ${error ? `<div class="error">${error}</div>` : ''}
  <form method="POST" action="/auth">
    <input type="hidden" name="client_id" value="${clientId}">
    <input type="hidden" name="redirect_uri" value="${redirectUri}">
    <input type="hidden" name="response_type" value="code">
    <input type="hidden" name="scope" value="${scope || 'openid profile email'}">
    <input type="hidden" name="state" value="${state || ''}">
    ${codeChallenge ? `<input type="hidden" name="code_challenge" value="${codeChallenge}">` : ''}
    ${codeChallengeMethod ? `<input type="hidden" name="code_challenge_method" value="${codeChallengeMethod}">` : ''}
    
    <label for="username">Username:</label>
    <input type="text" id="username" name="username" required>
    
    <label for="password">Password:</label>
    <input type="password" id="password" name="password" required>
    
    <button type="submit">Sign In</button>
  </form>
  <div class="info">
    <p><strong>Note:</strong> This is a demo login page.</p>
    <p>For production, remove hints and implement proper security measures.</p>
  </div>
</body>
</html>
  `;
}

// Parse form data from request body
function parseFormData(body) {
  const params = new URLSearchParams(body);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
}

exports.handler = async (event) => {
  try {
    const method = event.httpMethod || event.requestContext?.http?.method;
    let params;
    
    if (method === 'GET') {
      params = event.queryStringParameters || {};
    } else if (method === 'POST') {
      const body = event.body;
      const isBase64 = event.isBase64Encoded;
      const decodedBody = isBase64 ? Buffer.from(body, 'base64').toString('utf-8') : body;
      params = parseFormData(decodedBody);
    } else {
      return createErrorResponse('invalid_request', 'Method not allowed', 405);
    }
    
    const {
      client_id,
      redirect_uri,
      response_type,
      scope,
      state,
      code_challenge,
      code_challenge_method,
      username,
      password
    } = params;
    
    // Validate required parameters
    if (!client_id || !redirect_uri || !response_type) {
      return createErrorResponse('invalid_request', 'Missing required parameters');
    }
    
    // Validate client
    const client = await validateClient(client_id, null, redirect_uri);
    if (!client) {
      return createErrorResponse('invalid_client', 'Invalid client_id or redirect_uri');
    }
    
    // Only support authorization code flow
    if (response_type !== 'code') {
      return createErrorResponse('unsupported_response_type', 'Only response_type=code is supported');
    }
    
    // If GET request or no credentials, show login page
    if (method === 'GET' || !username || !password) {
      return createHTMLResponse(getLoginPage(
        client_id,
        redirect_uri,
        state,
        scope || 'openid profile email',
        code_challenge,
        code_challenge_method
      ));
    }
    
    // POST request with credentials - authenticate user
    const user = await verifyUserPassword(username, password);
    if (!user) {
      return createHTMLResponse(getLoginPage(
        client_id,
        redirect_uri,
        state,
        scope || 'openid profile email',
        code_challenge,
        code_challenge_method,
        'Invalid username or password'
      ), 401);
    }
    
    // Generate authorization code
    const code = await createAuthCode(
      user.user_id,
      client_id,
      redirect_uri,
      scope || 'openid profile email',
      code_challenge,
      code_challenge_method
    );
    
    // Redirect back to client with code
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }
    
    return {
      statusCode: 302,
      headers: {
        'Location': redirectUrl.toString(),
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache'
      },
      body: ''
    };
    
  } catch (error) {
    console.error('Error in auth handler:', error);
    return createErrorResponse('server_error', 'Internal server error', 500);
  }
};
