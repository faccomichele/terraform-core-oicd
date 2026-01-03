const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { SSMClient, GetParameterCommand, PutParameterCommand } = require('@aws-sdk/client-ssm');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const ssmClient = new SSMClient({});

const TABLES = {
  users: process.env.USERS_TABLE,
  clients: process.env.CLIENTS_TABLE,
  authCodes: process.env.AUTH_CODES_TABLE,
  refreshTokens: process.env.REFRESH_TOKENS_TABLE,
  applications: process.env.APPLICATIONS_TABLE,
  userApplications: process.env.USER_APPLICATIONS_TABLE
};

// Cache for issuer URL to avoid repeated SSM calls
// Note: Lambda containers in Node.js handle one request at a time,
// so module-level caching is safe for concurrent invocations
let cachedIssuerUrl = null;
let cacheTimestamp = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Get issuer URL from SSM Parameter Store
async function getIssuerUrl() {
  const now = Date.now();
  
  // Return cached value if still valid
  if (cachedIssuerUrl && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedIssuerUrl;
  }

  try {
    const response = await ssmClient.send(new GetParameterCommand({
      Name: process.env.ISSUER_URL_PARAM_NAME
    }));
    
    cachedIssuerUrl = response.Parameter.Value;
    cacheTimestamp = now;
    return cachedIssuerUrl;
  } catch (error) {
    if (error.name === 'ParameterNotFound') {
      console.error('SSM Parameter not found:', process.env.ISSUER_URL_PARAM_NAME);
      throw new Error('OIDC issuer URL parameter not found in SSM');
    } else if (error.name === 'AccessDeniedException') {
      console.error('Access denied to SSM parameter:', process.env.ISSUER_URL_PARAM_NAME);
      throw new Error('Access denied to OIDC issuer URL parameter');
    } else {
      console.error('Error getting issuer URL from SSM:', error.name, error.message);
      throw new Error(`Failed to retrieve OIDC issuer URL: ${error.message}`);
    }
  }
}

// Generate RSA key pair for JWT signing
async function generateKeyPair() {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    }, (err, publicKey, privateKey) => {
      if (err) reject(err);
      else resolve({ publicKey, privateKey });
    });
  });
}

// Get or generate JWT signing keys
async function getSigningKeys() {
  try {
    const response = await ssmClient.send(new GetParameterCommand({
      Name: process.env.JWT_KEYS_PARAM_NAME,
      WithDecryption: true
    }));
    
    const keys = JSON.parse(response.Parameter.Value);
    
    // If keys are empty, generate new ones
    if (!keys.private_key || !keys.public_key) {
      console.log('Generating new RSA key pair...');
      const { publicKey, privateKey } = await generateKeyPair();
      const kid = uuidv4();
      
      const newKeys = {
        private_key: privateKey,
        public_key: publicKey,
        kid: kid,
        alg: 'RS256'
      };
      
      const keysJson = JSON.stringify(newKeys);
      
      // Verify size is within SSM parameter limits (4KB for standard parameters)
      if (keysJson.length > 4096) {
        throw new Error(`JWT keys too large for SSM parameter: ${keysJson.length} bytes (max 4096)`);
      }
      
      await ssmClient.send(new PutParameterCommand({
        Name: process.env.JWT_KEYS_PARAM_NAME,
        Value: keysJson,
        Type: 'SecureString',
        Overwrite: true
      }));
      
      return newKeys;
    }
    
    return keys;
  } catch (error) {
    console.error('Error getting signing keys:', error);
    throw error;
  }
}

// Create JWT token
async function createJWT(payload, expiresIn = '1h') {
  const keys = await getSigningKeys();
  const issuerUrl = await getIssuerUrl();
  
  return jwt.sign(payload, keys.private_key, {
    algorithm: 'RS256',
    expiresIn: expiresIn,
    keyid: keys.kid,
    issuer: issuerUrl
  });
}

// Verify JWT token
async function verifyJWT(token) {
  const keys = await getSigningKeys();
  const issuerUrl = await getIssuerUrl();
  
  return jwt.verify(token, keys.public_key, {
    algorithms: ['RS256'],
    issuer: issuerUrl
  });
}

// DynamoDB operations
async function getItem(tableName, key) {
  const response = await docClient.send(new GetCommand({
    TableName: tableName,
    Key: key
  }));
  return response.Item;
}

async function putItem(tableName, item) {
  await docClient.send(new PutCommand({
    TableName: tableName,
    Item: item
  }));
}

async function queryItems(tableName, indexName, keyCondition, expressionAttributeValues) {
  const response = await docClient.send(new QueryCommand({
    TableName: tableName,
    IndexName: indexName,
    KeyConditionExpression: keyCondition,
    ExpressionAttributeValues: expressionAttributeValues
  }));
  return response.Items || [];
}

async function deleteItem(tableName, key) {
  await docClient.send(new DeleteCommand({
    TableName: tableName,
    Key: key
  }));
}

// User operations
async function getUserById(userId) {
  return await getItem(TABLES.users, { user_id: userId });
}

async function getUserByUsername(username) {
  const items = await queryItems(
    TABLES.users,
    'username-index',
    'username = :username',
    { ':username': username }
  );
  return items.length > 0 ? items[0] : null;
}

/**
 * Create a new user with bcrypt password hashing
 * @param {string} username - The username for the new user
 * @param {string} password - The plain text password (will be hashed with bcrypt)
 * @param {string} email - The email address for the new user
 * @returns {Promise<object>} - The created user object (includes password_hash)
 */
async function createUser(username, password, email) {
  const userId = uuidv4();
  
  // Use bcrypt for secure password hashing
  // Salt rounds = 10 provides a good balance between security and performance
  const passwordHash = await bcrypt.hash(password, 10);
  
  const user = {
    user_id: userId,
    username: username,
    password_hash: passwordHash,
    email: email,
    email_verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  await putItem(TABLES.users, user);
  return user;
}

async function verifyUserPassword(username, password) {
  const user = await getUserByUsername(username);
  if (!user) return null;
  
  // Use bcrypt for secure password comparison
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return null;
  
  return user;
}

async function updateUserPassword(userId, newPassword) {
  const user = await getUserById(userId);
  if (!user) return null;
  
  // Use bcrypt for secure password hashing
  const passwordHash = await bcrypt.hash(newPassword, 10);
  
  user.password_hash = passwordHash;
  user.updated_at = new Date().toISOString();
  
  await putItem(TABLES.users, user);
  return user;
}

// Client operations
async function getClientById(clientId) {
  return await getItem(TABLES.clients, { client_id: clientId });
}

async function validateClient(clientId, clientSecret = null, redirectUri = null) {
  const client = await getClientById(clientId);
  if (!client) return null;
  
  if (clientSecret && client.client_secret !== clientSecret) return null;
  if (redirectUri && !client.redirect_uris.includes(redirectUri)) return null;
  
  return client;
}

// Authorization code operations
async function createAuthCode(userId, clientId, redirectUri, scope, codeChallenge = null, codeChallengeMethod = null, applicationId = null, account = null) {
  const code = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 minutes
  
  const authCode = {
    code: code,
    user_id: userId,
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scope,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod
  };
  
  // Add optional fields
  if (applicationId) {
    authCode.application_id = applicationId;
  }
  if (account) {
    authCode.account = account;
  }
  
  await putItem(TABLES.authCodes, authCode);
  return code;
}

async function getAuthCode(code) {
  return await getItem(TABLES.authCodes, { code: code });
}

async function deleteAuthCode(code) {
  await deleteItem(TABLES.authCodes, { code: code });
}

// Refresh token operations
async function createRefreshToken(userId, clientId, scope) {
  const tokenId = uuidv4();
  const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
  
  const refreshToken = {
    token_id: tokenId,
    user_id: userId,
    client_id: clientId,
    scope: scope,
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  };
  
  await putItem(TABLES.refreshTokens, refreshToken);
  return tokenId;
}

async function getRefreshToken(tokenId) {
  return await getItem(TABLES.refreshTokens, { token_id: tokenId });
}

async function deleteRefreshToken(tokenId) {
  await deleteItem(TABLES.refreshTokens, { token_id: tokenId });
}

// Response helpers
function createResponse(statusCode, body, headers = {}) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      ...headers
    },
    body: JSON.stringify(body)
  };
}

function createErrorResponse(error, description, statusCode = 400) {
  return createResponse(statusCode, {
    error: error,
    error_description: description
  });
}

function createHTMLResponse(html, statusCode = 200) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': '*'
    },
    body: html
  };
}

// Client operations
/**
 * Create a new OAuth client
 * @param {string} clientId - The client ID
 * @param {string} clientSecret - The client secret
 * @param {Array<string>} redirectUris - Array of allowed redirect URIs
 * @param {string} name - The client name
 * @param {string} description - The client description (optional)
 * @returns {Promise<object>} - The created client object
 */
async function createClient(clientId, clientSecret, redirectUris, name, description = '') {
  const client = {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: redirectUris,
    name: name,
    description: description,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  await putItem(TABLES.clients, client);
  return client;
}

/**
 * Update an existing OAuth client
 * @param {string} clientId - The client ID
 * @param {object} updates - Object containing fields to update
 * @returns {Promise<object>} - The updated client object
 */
async function updateClient(clientId, updates) {
  const client = await getClientById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }
  
  const updatedClient = {
    ...client,
    ...updates,
    client_id: clientId, // Ensure client_id is not changed
    updated_at: new Date().toISOString()
  };
  
  await putItem(TABLES.clients, updatedClient);
  return updatedClient;
}

// Application operations
/**
 * Get application by ID
 * @param {string} applicationId - The application ID
 * @returns {Promise<object|null>} - The application object or null if not found
 */
async function getApplicationById(applicationId) {
  return await getItem(TABLES.applications, { application_id: applicationId });
}

/**
 * Create a new application
 * @param {string} applicationId - The application ID (or will be generated)
 * @param {string} clientId - The associated OAuth client ID
 * @param {string} name - The application name
 * @param {string} description - The application description (optional)
 * @param {string} account - The account identifier (optional)
 * @returns {Promise<object>} - The created application object
 */
async function createApplication(applicationId, clientId, name, description = '', account = '') {
  const appId = applicationId || uuidv4();
  
  const application = {
    application_id: appId,
    client_id: clientId,
    name: name,
    description: description,
    account: account,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  await putItem(TABLES.applications, application);
  return application;
}

/**
 * Update an existing application
 * @param {string} applicationId - The application ID
 * @param {object} updates - Object containing fields to update
 * @returns {Promise<object>} - The updated application object
 */
async function updateApplication(applicationId, updates) {
  const application = await getApplicationById(applicationId);
  if (!application) {
    throw new Error('Application not found');
  }
  
  const updatedApplication = {
    ...application,
    ...updates,
    application_id: applicationId, // Ensure application_id is not changed
    updated_at: new Date().toISOString()
  };
  
  await putItem(TABLES.applications, updatedApplication);
  return updatedApplication;
}

// User-Application operations
/**
 * Get user-application mapping
 * @param {string} userId - The user ID
 * @param {string} applicationId - The application ID
 * @returns {Promise<object|null>} - The user-application mapping or null if not found
 */
async function getUserApplication(userId, applicationId) {
  return await getItem(TABLES.userApplications, { 
    user_id: userId, 
    application_id: applicationId 
  });
}

/**
 * Create a new user-application mapping
 * @param {string} userId - The user ID
 * @param {string} applicationId - The application ID
 * @param {string} account - The account identifier (optional)
 * @returns {Promise<object>} - The created user-application mapping object
 */
async function createUserApplication(userId, applicationId, account = '') {
  const userApplication = {
    user_id: userId,
    application_id: applicationId,
    account: account,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  await putItem(TABLES.userApplications, userApplication);
  return userApplication;
}

/**
 * Update an existing user-application mapping
 * @param {string} userId - The user ID
 * @param {string} applicationId - The application ID
 * @param {object} updates - Object containing fields to update
 * @returns {Promise<object>} - The updated user-application mapping object
 */
async function updateUserApplication(userId, applicationId, updates) {
  const userApplication = await getUserApplication(userId, applicationId);
  if (!userApplication) {
    throw new Error('User-application mapping not found');
  }
  
  const updatedUserApplication = {
    ...userApplication,
    ...updates,
    user_id: userId, // Ensure user_id is not changed
    application_id: applicationId, // Ensure application_id is not changed
    updated_at: new Date().toISOString()
  };
  
  await putItem(TABLES.userApplications, updatedUserApplication);
  return updatedUserApplication;
}

module.exports = {
  getIssuerUrl,
  getSigningKeys,
  createJWT,
  verifyJWT,
  getUserById,
  getUserByUsername,
  createUser,
  verifyUserPassword,
  updateUserPassword,
  getClientById,
  validateClient,
  createAuthCode,
  getAuthCode,
  deleteAuthCode,
  createRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  createResponse,
  createErrorResponse,
  createHTMLResponse,
  TABLES,
  // New exports for management functions
  createClient,
  updateClient,
  getApplicationById,
  createApplication,
  updateApplication,
  getUserApplication,
  createUserApplication,
  updateUserApplication,
  putItem,
  getItem
};
