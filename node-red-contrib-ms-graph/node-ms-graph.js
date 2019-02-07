const helper = require('node-red-viseo-helper');
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
    this.on('input', (data) => { input(RED, node, data, config) });
  }
  RED.nodes.registerType("ms-graph", register, {
      credentials : {
        redirect:     { type: "text" },
        username:     { type: "text" },
        password:     { type: "text" }
      }
  });
}

async function input(RED, node, data, config) {
  
  let action = config.action;
  let output = config.output || "payload";
  
  let redirect = helper.getContextValue(RED, node, data, config.redirect, config.redirectType);
  let state = helper.getContextValue(RED, node, data, config.state, config.stateType);
  let scope = helper.getContextValue(RED, node, data, config.scope, config.scopeType);
  let authority = helper.getContextValue(RED, node, data, config.authority, config.authorityType);

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
    helper.setContextValue(RED, node, data, output, url, config.outputType);
    return node.send(data);
  }

  if (action === "unauth") {
    let url = getUnauthUrl(credentials);
    if (!url) node.error("Information missing");
    helper.setContextValue(RED, node, data, output, url, config.outputType);
    return node.send(data);
  }

  if (action === "token-code") {
    let code = helper.getContextValue(RED, node, data, config.code, config.codeType);
    if (!code) return node.error("Code missing");

    try { 
      let json = await getTokenFromCode(credentials, code);
      helper.setContextValue(RED, node, data, output, JSON.parse(json), config.outputType);
      return node.send(data);
    }
    catch (err) {
      node.error(err);
      helper.setContextValue(RED, node, data, output, "ERROR", config.outputType);
      return node.send(data);
    }
  }

  if (action === "token-password") {
    let username = helper.getContextValue(RED, node, data, config.username, config.usernameType);
    let password = helper.getContextValue(RED, node, data, config.password, config.passwordType);
    if (!username || !password) return node.error("Credentials missing");

    try { 
      let json = await getTokenFromPass(credentials, username, password);
      helper.setContextValue(RED, node, data, output, JSON.parse(json), config.outputType);
      return node.send(data);
    }
    catch (err) {
      node.error(err);
      helper.setContextValue(RED, node, data, output,  "ERROR", config.outputType);
      return node.send(data);
    }
  }

  if (action === "token-code-refresh") {
    let refresh = helper.getContextValue(RED, node, data, config.refresh, config.refreshType);
    if (!refresh) node.error("Refresh missing");

    try { 
      let json = await getTokenFromRefresh(credentials, refresh);
      helper.setContextValue(RED, node, data, output, JSON.parse(json), config.outputType);
      return node.send(data);
    }
    catch (err) {
      node.error(err); 
    }
  }

  if (action === "user") {
    let token = helper.getContextValue(RED, node, data, config.token, config.tokenType);
    if (!token) return node.error("Token missing");

    try { 
      let json = await getUser(token);
      helper.setContextValue(RED, node, data, output, JSON.parse(json), config.outputType);
      return node.send(data);
    }
    catch (err) {
      node.error(err);
      helper.setContextValue(RED, node, data, output,  "ERROR", config.outputType);
      return node.send(data);
    }
  }

  if (action === "photo") {
    let token = config.token;
    if (config.tokenType !== 'str') {
      let loc = (config.tokenType === 'global') ? node.context().global : data;
      token = helper.getByString(loc, token);
    }
    if (!token) return node.error("Token missing");

    try { 
      let picture = await getUserPhoto(token);
      helper.setByString(outLoc, output, picture);
      return node.send(data);
    }
    catch (err) {
      node.error(err);
      helper.setByString(outLoc, output, "ERROR");
      return node.send(data);
    }
  }

  if (action === "rooms") {
    let token = helper.getContextValue(RED, node, data, config.token, config.tokenType);
    if (!token) return node.error("Token missing");

    try { 
      let json = await getRooms(token);
      helper.setContextValue(RED, node, data, output, JSON.parse(json), config.outputType);
      return node.send(data);
    }
    catch (err) {
      node.error(err);
      helper.setContextValue(RED, node, data, output,  "ERROR", config.outputType);
      return node.send(data);
    }
  }
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
  
    return request(req);
  }

async function getUser(access) {
  
    let req = {
      method: "GET",
      uri:  "https://graph.microsoft.com/v1.0/me/",
      headers: {
        "Authorization": "Bearer " + access,
        "Content-Type": "application/json"
      }
    };
  
    return request(req);
  }

  async function getUserPhoto(access) {
    let result = {};
    let buffer = {
      method: "GET",
      encoding: null,
      uri:  "https://graph.microsoft.com/v1.0/me/photo/$value",
      headers: {
        "Authorization": "Bearer " + access,
        "Content-Type": "application/json"
      }
    };

    let metadata = {
      method: "GET",
      uri:  "https://graph.microsoft.com/v1.0/me/photo",
      headers: {
        "Authorization": "Bearer " + access,
        "Content-Type": "application/json"
      }
    };

    result.buffer = await request(buffer);
    result.buffer = Buffer.from(result.buffer);
    result.metadata = await request(metadata);
    result.metadata = JSON.parse(result.metadata);

    return result;
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
    
      return request(req);
    }