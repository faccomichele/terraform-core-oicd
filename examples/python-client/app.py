import os
from flask import Flask, redirect, url_for, session, request, jsonify
from authlib.integrations.flask_client import OAuth
import secrets

app = Flask(__name__)
# WARNING: This is for demo purposes only!
# In production, use a strong random secret from environment variables
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))

# Configuration - Update these after deploying your OIDC provider
OIDC_ISSUER = os.environ.get('OIDC_ISSUER', 'https://your-api-gateway-url.amazonaws.com/dev')
CLIENT_ID = os.environ.get('CLIENT_ID', 'test-client')
CLIENT_SECRET = os.environ.get('CLIENT_SECRET', 'test-secret')
REDIRECT_URI = os.environ.get('REDIRECT_URI', 'http://localhost:5000/callback')

# Initialize OAuth
oauth = OAuth(app)
oauth.register(
    name='oidc',
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    server_metadata_url=f'{OIDC_ISSUER}/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid profile email',
        'code_challenge_method': 'S256'  # Enable PKCE
    }
)

@app.route('/')
def home():
    user = session.get('user')
    if user:
        return f'''
            <h1>Welcome, {user.get('name', user.get('sub'))}!</h1>
            <h2>User Information:</h2>
            <pre>{jsonify(user).get_data(as_text=True)}</pre>
            <p><a href="/logout">Logout</a></p>
        '''
    return '''
        <h1>OIDC Client Example (Python)</h1>
        <p>This is an example client application using the serverless OIDC provider.</p>
        <p><a href="/login">Login with OIDC</a></p>
    '''

@app.route('/login')
def login():
    redirect_uri = url_for('callback', _external=True)
    return oauth.oidc.authorize_redirect(redirect_uri)

@app.route('/callback')
def callback():
    try:
        token = oauth.oidc.authorize_access_token()
        
        # Get user info
        user = token.get('userinfo')
        if not user:
            # If userinfo is not in token, fetch it
            resp = oauth.oidc.get('userinfo')
            user = resp.json()
        
        session['user'] = user
        session['token'] = {
            'access_token': token.get('access_token'),
            'id_token': token.get('id_token'),
            'expires_in': token.get('expires_in')
        }
        
        return redirect('/')
    except Exception as e:
        return f'''
            <h1>Authentication Error</h1>
            <p>{str(e)}</p>
            <p><a href="/">Go back</a></p>
        ''', 500

@app.route('/logout')
def logout():
    session.pop('user', None)
    session.pop('token', None)
    return redirect('/')

@app.route('/userinfo')
def userinfo():
    """API endpoint to get user info"""
    user = session.get('user')
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    return jsonify(user)

if __name__ == '__main__':
    print('Starting Flask application...')
    print(f'OIDC_ISSUER: {OIDC_ISSUER}')
    print(f'CLIENT_ID: {CLIENT_ID}')
    print(f'REDIRECT_URI: {REDIRECT_URI}')
    print('')
    print('Navigate to: http://localhost:5000')
    app.run(debug=True, port=5000)
