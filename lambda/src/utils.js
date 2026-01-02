const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({});
const ssmClient = new SSMClient({});

const TABLES = {
  users: process.env.USERS_TABLE,
  clients: process.env.CLIENTS_TABLE,
  authCodes: process.env.AUTH_CODES_TABLE,
  refreshTokens: process.env.REFRESH_TOKENS_TABLE
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
    const response = await secretsClient.send(new GetSecretValueCommand({
      SecretId: process.env.JWT_SECRET_ARN
    }));
    
    const keys = JSON.parse(response.SecretString);
    
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
      
      await secretsClient.send(new PutSecretValueCommand({
        SecretId: process.env.JWT_SECRET_ARN,
        SecretString: JSON.stringify(newKeys)
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

async function createUser(username, password, email, profile = {}) {
  const userId = uuidv4();
  
  // ⚠️ SECURITY WARNING: SHA-256 is NOT SECURE for password hashing!
  // This is for DEMO/TESTING purposes only.
  // For production, you MUST use:
  //   - bcrypt (recommended)
  //   - scrypt
  //   - Argon2
  // These algorithms include salt and are designed to be slow to prevent brute-force attacks.
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  
  const user = {
    user_id: userId,
    username: username,
    password_hash: passwordHash,
    email: email,
    profile: profile,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  await putItem(TABLES.users, user);
  return user;
}

async function verifyUserPassword(username, password) {
  const user = await getUserByUsername(username);
  if (!user) return null;
  
  // ⚠️ SECURITY WARNING: SHA-256 is NOT SECURE for password hashing!
  // This is for DEMO/TESTING purposes only.
  // For production, use bcrypt.compare() or similar secure comparison.
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  if (passwordHash !== user.password_hash) return null;
  
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
async function createAuthCode(userId, clientId, redirectUri, scope, codeChallenge = null, codeChallengeMethod = null) {
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

module.exports = {
  getIssuerUrl,
  getSigningKeys,
  createJWT,
  verifyJWT,
  getUserById,
  getUserByUsername,
  createUser,
  verifyUserPassword,
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
  TABLES
};
