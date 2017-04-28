const helper = require('node-red-viseo-helper');
const OAuth  = require('oauth');
const uuid   = require('node-uuid');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("ms-graph-oauth", register, {});
}

const input = (node, data, config) => {
    let credentials = {
        'authority': 'https://login.microsoftonline.com/common',
        'authorize_endpoint': '/oauth2/v2.0/authorize',
        'token_endpoint': '/oauth2/v2.0/token',
        'client_id':     config.appId,
        'client_secret': config.appSecret,
        'redirect_uri':  config.redirect,
        'scope':         config.scope || 'User.Read',
        'state':         helper.getByString(data, config.state, config.state)
    }

    // Resolve a ClientCode
    if (config.code){
        let code = helper.getByString(data, config.code)
        if (code){
            getTokenFromCode(credentials, code, (err, accessToken, refreshToken)=>{
                if (err) return node.warn(err);
                helper.setByString(data, config.refresh,  refreshToken);
                helper.setByString(data, config.access,  accessToken);
                node.send(data);
            });
            return;
        }
    }

    // Retrieve Refresh Token then set back Access Token
    if (config.refresh){
        let refresh = helper.getByString(data, config.refresh)
        if (refresh){
            getTokenFromRefreshToken(credentials, refresh, (err, accessToken) => {
                if (err) return node.warn(err);
                helper.setByString(data, config.access, accessToken);
                node.send(data);
            });
            return;
        }
    }

    // Build Authentication URL
    let url = getAuthUrl(credentials);
    helper.setByString(data, config.url || 'payload', url);
    node.send(data);
}

// --------------------------------------------------------------------------
//  LIBRARY
// --------------------------------------------------------------------------

const getAuthUrl = (CREDENTIALS) => {
  return CREDENTIALS.authority + CREDENTIALS.authorize_endpoint +
    '?client_id=' + CREDENTIALS.client_id +
    '&response_type=code' +
    '&redirect_uri=' + CREDENTIALS.redirect_uri +
    '&scope=' + CREDENTIALS.scope +
    '&response_mode=query' +
    '&nonce=' + uuid.v4() +
    '&state=' + CREDENTIALS.state;
}


const getTokenFromCode = (CREDENTIALS, code, callback) => {
  var OAuth2 = OAuth.OAuth2;
  var oauth2 = new OAuth2(
    CREDENTIALS.client_id,
    CREDENTIALS.client_secret,
    CREDENTIALS.authority,
    CREDENTIALS.authorize_endpoint,
    CREDENTIALS.token_endpoint
  );

  oauth2.getOAuthAccessToken(
    code,
    {
      grant_type: 'authorization_code',
      redirect_uri: CREDENTIALS.redirect_uri,
      response_mode: 'form_post',
      nonce: uuid.v4(),
      state: CREDENTIALS.state
    },
    (e, accessToken, refreshToken) => {
      callback(e, accessToken, refreshToken);
    }
  );
}

const getTokenFromRefreshToken = (CREDENTIALS, refreshToken, callback) => {
  var OAuth2 = OAuth.OAuth2;
  var oauth2 = new OAuth2(
    CREDENTIALS.client_id,
    CREDENTIALS.client_secret,
    CREDENTIALS.authority,
    CREDENTIALS.authorize_endpoint,
    CREDENTIALS.token_endpoint
  );

  oauth2.getOAuthAccessToken(
    refreshToken,
    {
      grant_type: 'refresh_token',
      redirect_uri: CREDENTIALS.redirect_uri,
      response_mode: 'form_post',
      nonce: uuid.v4(),
      state: CREDENTIALS.state
    },
    function (e, accessToken) {
      callback(e, accessToken);
    }
  );
}