const helper = require('node-red-viseo-helper');
const OAuth = require('oauth');
const request = require('request-promise');
const uuidv4 = require('uuid/v4');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function (RED) {
  const register = function (config) {
    RED.nodes.createNode(this, config);
    config.redirect = this.credentials.redirect;
    config.username = this.credentials.username;
    config.password = this.credentials.password;
    config.config = RED.nodes.getCredentials(config.config);
    let node = this;
    this.on('input', (data) => { input(node, data, config) });
  }
  RED.nodes.registerType("ms-graph", register, {
      credentials : {
        redirect:     { type: "text" },
        username:     { type: "text" },
        password:     { type: "text" }
      }
  });
}

async function input(node, data, config) {
  
  let action = config.action,
      redirect = config.redirect,
      scope = config.scope,
      state = config.state,
      authority = config.authority,
      output = config.output || "payload",
      outLoc = (config.outputType === 'global') ? node.context().global : data;

  if (config.redirectType !== 'str') {
    let loc = (config.redirectType === 'global') ? node.context().global : data;
    redirect = helper.getByString(loc, redirect);
  }

  if (config.stateType !== 'str') {
    let loc = (config.stateType === 'global') ? node.context().global : data;
    state = helper.getByString(loc, state);
  }

  if (config.scopeType !== 'str') {
    let loc = (config.scopeType === 'global') ? node.context().global : data;
    scope = helper.getByString(loc, scope);
  }

  if (config.authorityType !== 'str') {
    let loc = (config.authorityType === 'global') ? node.context().global : data;
    authority = helper.getByString(loc, authority);
  }



  scope = scope || 'User.Read';
  scope = scope.toLowerCase().replace(/,/g,' ');

  let credentials = {
    'authority': authority || 'https://login.microsoftonline.com/viseo.com',
    'authorize_endpoint': '/oauth2/v2.0/authorize',
    'end_session': '/oauth2/v2.0/logout',
    'token_endpoint': '/oauth2/v2.0/token',
    'client_id': config.config.clientid,
    'client_secret': config.config.clientsecret,
    'redirect_uri': redirect,
    'scope': scope,
    'state': state
  }

  if (action === "auth") {
    let url = getAuthUrl(credentials);
    if (!url) node.error("Information missing");
    helper.setByString(outLoc, output, url);
    return node.send(data);
  }

  if (action === "unauth") {
    let url = getUnauthUrl(credentials);
    if (!url) node.error("Information missing");
    helper.setByString(outLoc, output, url);
    return node.send(data);
  }

  if (action === "token-code") {
    let code = config.code;
    if (config.codeType !== 'str') {
      let loc = (config.codeType === 'global') ? node.context().global : data;
      code = helper.getByString(loc, code);
    }
    if (!code) return node.error("Code missing");

    try { 
      let json = await getTokenFromCode(credentials, code);
      helper.setByString(outLoc, output, JSON.parse(json));
      return node.send(data);
    }
    catch (err) {
      node.error(err);
      helper.setByString(outLoc, output, "ERROR");
      return node.send(data);
    }
  }

  if (action === "token-password") {
    let username = config.username;
    let password = config.password;

    if (config.usernameType !== 'str') {
      let loc = (config.usernameType === 'global') ? node.context().global : data;
      username = helper.getByString(loc, username);
    }
  
    if (config.passwordType !== 'str') {
      let loc = (config.passwordType === 'global') ? node.context().global : data;
      password = helper.getByString(loc, password);
    }
    if (!username || !password) return node.error("Credentials missing");

    try { 
      let json = await getTokenFromPass(credentials, username, password);
      helper.setByString(outLoc, output, JSON.parse(json));
      return node.send(data);
    }
    catch (err) {
      node.error(err);
      helper.setByString(outLoc, output, "ERROR");
      return node.send(data);
    }
  }

  if (action === "token-code-refresh") {
    let refresh = config.refresh;
    if (config.refreshType !== 'str') {
      let loc = (config.refreshType === 'global') ? node.context().global : data;
      refresh = helper.getByString(loc, refresh);
    }
    if (!refresh) node.error("Refresh missing");

    try { 
      let json = await getTokenFromRefresh(credentials, refresh);
      helper.setByString(outLoc, output, JSON.parse(json));
      return node.send(data);
    }
    catch (err) {
      node.error(err); 
    }
  }

  if (action === "user") {
    let token = config.token;
    if (config.tokenType !== 'str') {
      let loc = (config.tokenType === 'global') ? node.context().global : data;
      token = helper.getByString(loc, token);
    }
    if (!token) return node.error("Token missing");

    try { 
      let json = await getUser(token);
      helper.setByString(outLoc, output, JSON.parse(json));
      return node.send(data);
    }
    catch (err) {
      node.error(err);
      helper.setByString(outLoc, output, "ERROR");
      return node.send(data);
    }
  }

  if (action === "rooms") {
    let token = config.token;
    if (config.tokenType !== 'str') {
      let loc = (config.tokenType === 'global') ? node.context().global : data;
      token = helper.getByString(loc, token);
    }
    if (!token) return node.error("Token missing");

    try { 
      let json = await getRooms(token);
      helper.setByString(outLoc, output, JSON.parse(json));
      return node.send(data);
    }
    catch (err) {
      node.error(err);
      helper.setByString(outLoc, output, "ERROR");
      return node.send(data);
    }
  }

  //let token = JSON.parse(key).access_token;

  // Retrieve Refresh Token then set back Access Token
  /*if (config.refresh) {
    let refresh = helper.getByString(data, config.refresh)
    if (refresh) {
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
  node.send(data);*/
}

// --------------------------------------------------------------------------
//  LIBRARY
// --------------------------------------------------------------------------

const getAuthUrl = (CREDENTIALS) => {
  if (!CREDENTIALS.client_id || !CREDENTIALS.redirect_uri || !CREDENTIALS.scope) return "";
  let url = CREDENTIALS.authority + CREDENTIALS.authorize_endpoint + '?client_id=' + CREDENTIALS.client_id + '&response_type=code';
  url += '&redirect_uri=' + CREDENTIALS.redirect_uri + '&scope=' + CREDENTIALS.scope + '&response_mode=query&state=' + CREDENTIALS.state;
  url += '&nonce=' + uuidv4();
  return url;
}

const getUnauthUrl = (CREDENTIALS) => {
  let url = CREDENTIALS.authority + CREDENTIALS.end_session + '?state=' + CREDENTIALS.state;
  url += '&post_logout_redirect_uri=' + CREDENTIALS.redirect_uri;
  return url;
}

async function getTokenFromCode(CREDENTIALS, code) {

  let req = {
    method: "POST",
    uri:  CREDENTIALS.authority + CREDENTIALS.token_endpoint,
    formData: {
      grant_type: 'authorization_code',
      client_id: CREDENTIALS.client_id,
      client_secret: CREDENTIALS.client_secret,
      scope: CREDENTIALS.scope,
      code: code,
      redirect_uri: CREDENTIALS.redirect_uri
    }
  };

  return request(req);
}

async function getTokenFromPass(CREDENTIALS, username, password) {
  let req = {
    method: "POST",
    uri:  CREDENTIALS.authority +  CREDENTIALS.token_endpoint,
    formData: {
        grant_type: 'password',
        client_id: CREDENTIALS.client_id,
        client_secret: CREDENTIALS.client_secret,
        scope: CREDENTIALS.scope,
        username: username,
        password: password
      }
  };
  return request(req)
}

async function getTokenFromRefresh(CREDENTIALS, refresh) {
  
    let req = {
      method: "POST",
      uri:  CREDENTIALS.authority + CREDENTIALS.token_endpoint,
      formData: {
        grant_type: 'refresh_token',
        client_id: CREDENTIALS.client_id,
        client_secret: CREDENTIALS.client_secret,
        scope: CREDENTIALS.scope,
        refresh_token: refresh,
        redirect_uri: CREDENTIALS.redirect_uri
      }
    };
  
    console.log(req);
    return request(req);
  }

async function getUser(access) {
  
    let req = {
      method: "GET",
      uri:  "https://graph.microsoft.com/v1.0/me",
      headers: {
        "Authorization": "Bearer " + access,
        "Content-Type": "application/json"
      }
    };
  
    console.log(req);
    return request(req);
  }

  async function getRooms(access) {
    
      let req = {
        method: "GET",
        uri:  "https://graph.microsoft.com/beta/me/findRooms",
        headers: {
          "Authorization": "Bearer " + access,
          "Content-Type": "application/json"
        }
      };
    
      console.log(req);
      return request(req);
    }