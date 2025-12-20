const express = require('express');
const session = require('express-session');
const { Issuer, generators } = require('openid-client');

const app = express();
const port = 3000;

// Configuration - Update these after deploying your OIDC provider
const OIDC_ISSUER = process.env.OIDC_ISSUER || 'https://your-api-gateway-url.amazonaws.com/dev';
const CLIENT_ID = process.env.CLIENT_ID || 'test-client';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'test-secret';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/callback';

// Session configuration
// WARNING: This is for demo purposes only!
// In production, use a strong random secret from environment variables
app.use(session({
  secret: process.env.SESSION_SECRET || 'my-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS in production
}));

let client;

// Initialize OIDC client
async function initializeOIDC() {
  try {
    console.log('Discovering OIDC configuration from:', OIDC_ISSUER);
    const issuer = await Issuer.discover(OIDC_ISSUER);
    console.log('Discovered issuer:', issuer.metadata);
    
    client = new issuer.Client({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uris: [REDIRECT_URI],
      response_types: ['code']
    });
    
    console.log('OIDC client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize OIDC client:', error);
    throw error;
  }
}

// Home page
app.get('/', (req, res) => {
  if (req.session.userinfo) {
    res.send(`
      <h1>Welcome, ${req.session.userinfo.name || req.session.userinfo.sub}!</h1>
      <h2>User Information:</h2>
      <pre>${JSON.stringify(req.session.userinfo, null, 2)}</pre>
      <h2>Tokens:</h2>
      <pre>${JSON.stringify({
        access_token: req.session.tokens.access_token,
        id_token: req.session.tokens.id_token,
        expires_in: req.session.tokens.expires_in
      }, null, 2)}</pre>
      <p><a href="/logout">Logout</a></p>
    `);
  } else {
    res.send(`
      <h1>OIDC Client Example</h1>
      <p>This is an example client application using the serverless OIDC provider.</p>
      <p><a href="/login">Login with OIDC</a></p>
    `);
  }
});

// Initiate login
app.get('/login', (req, res) => {
  const code_verifier = generators.codeVerifier();
  const code_challenge = generators.codeChallenge(code_verifier);
  
  // Store code_verifier in session for later use
  req.session.code_verifier = code_verifier;
  
  const authorizationUrl = client.authorizationUrl({
    scope: 'openid profile email',
    code_challenge,
    code_challenge_method: 'S256',
    state: generators.state()
  });
  
  res.redirect(authorizationUrl);
});

// OAuth callback
app.get('/callback', async (req, res) => {
  try {
    const params = client.callbackParams(req);
    const code_verifier = req.session.code_verifier;
    
    // Exchange authorization code for tokens
    const tokenSet = await client.callback(REDIRECT_URI, params, {
      code_verifier,
      state: params.state
    });
    
    console.log('Received tokens:', {
      access_token: tokenSet.access_token.substring(0, 20) + '...',
      id_token: tokenSet.id_token.substring(0, 20) + '...',
      refresh_token: tokenSet.refresh_token ? 'present' : 'absent'
    });
    
    // Get user info
    const userinfo = await client.userinfo(tokenSet.access_token);
    console.log('User info:', userinfo);
    
    // Store in session
    req.session.tokens = {
      access_token: tokenSet.access_token,
      id_token: tokenSet.id_token,
      refresh_token: tokenSet.refresh_token,
      expires_in: tokenSet.expires_in
    };
    req.session.userinfo = userinfo;
    
    res.redirect('/');
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).send(`
      <h1>Authentication Error</h1>
      <p>${error.message}</p>
      <p><a href="/">Go back</a></p>
    `);
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Start server
initializeOIDC().then(() => {
  app.listen(port, () => {
    console.log(`Example client app listening at http://localhost:${port}`);
    console.log('Configuration:');
    console.log(`  OIDC_ISSUER: ${OIDC_ISSUER}`);
    console.log(`  CLIENT_ID: ${CLIENT_ID}`);
    console.log(`  REDIRECT_URI: ${REDIRECT_URI}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
