const { createResponse, getIssuerUrl } = require('./utils');

exports.handler = async (event) => {
  try {
    const issuerUrl = await getIssuerUrl();
    
    const configuration = {
      issuer: issuerUrl,
      authorization_endpoint: `${issuerUrl}/auth`,
      token_endpoint: `${issuerUrl}/token`,
      userinfo_endpoint: `${issuerUrl}/userinfo`,
      jwks_uri: `${issuerUrl}/jwks`,
      response_types_supported: [
        "code",
        "token",
        "id_token",
        "code token",
        "code id_token",
        "token id_token",
        "code token id_token"
      ],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      scopes_supported: ["openid", "profile", "email"],
      token_endpoint_auth_methods_supported: [
        "client_secret_basic",
        "client_secret_post",
        "none"
      ],
      claims_supported: [
        "sub",
        "iss",
        "aud",
        "exp",
        "iat",
        "name",
        "email",
        "email_verified",
        "profile",
        "picture"
      ],
      code_challenge_methods_supported: ["S256", "plain"],
      grant_types_supported: [
        "authorization_code",
        "refresh_token",
        "implicit"
      ]
    };
    
    return createResponse(200, configuration);
  } catch (error) {
    console.error('Error in wellknown handler:', error);
    return createResponse(500, {
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
};
