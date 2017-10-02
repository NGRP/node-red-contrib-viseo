const request = require('request-promise');
const extend  = require('extend');
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let sfConfig = RED.nodes.getCredentials(config.sfConfig);
        let node = this;
        this.on('input', (data)  => { input(node, data, config, sfConfig)  });
    }
    RED.nodes.registerType("salesforce-object", register, {});
}

async function input (node, data, config, sfConfig) {

    // Get values

    let instance = sfConfig.instance,
        token = config.token,
        action = (config.action).toUpperCase(),
        object = config.object,
        objectId = config.objectId,
        objectLabel = config.objectLabel,
        objectObject = config.objectObject,
        querySelect = config.querySelect,
        queryWhere = config.queryWhere,
        queryEquals = config.queryEquals;
        
    if (object === "else") {
        if (objectLabel === "" || objectLabel === undefined)  return node.error("An object label must be specified");
        else {
            object = objectLabel[0].toUpperCase() + objectLabel.substr(1).toLowerCase();
        }
    }

    let objectIdType = config.objectIdType,
        objectObjectType = config.objectObjectType,
        tokenType = config.tokenType;

    // Get token
    if (tokenType !== 'str') {
        let loc = (tokenType === 'global') ? node.context().global : data;
        token = helper.getByString(loc, config.token);
    }
    if (token === undefined ||token === "") {
        try { let json = await getToken(sfConfig.id, sfConfig.secret, sfConfig.refresh);
                  token = JSON.parse(json).access_token;
        } catch (err) { return node.error(err); }
    }

        
    if (action === "QUERY") {

        // Get query info
        let querySelectType = config.querySelectType,
            queryWhereType = config.queryWhereType,
            queryEqualsType = config.queryEqualsType;

            console.log(queryEqualsType, querySelectType, queryWhereType);

        if (querySelectType !== 'str') {
            let loc = (querySelectType === 'global') ? node.context().global : data;
            querySelect = helper.getByString(loc, config.querySelect);
        }
        if (queryWhereType !== 'str') {
            let loc = (queryWhereType === 'global') ? node.context().global : data;
            queryWhere = helper.getByString(loc, config.queryWhere);
        }
        if (queryEqualsType !== 'str') {
            let loc = (queryEqualsType === 'global') ? node.context().global : data;
            queryEquals = helper.getByString(loc, config.queryEquals);
        }

        // Process fields
        querySelect = querySelect.replace(/ /g,'');
        querySelect = querySelect.replace(/,/g,'+,+');
        queryWhere += "+=+'" + queryEquals + "'";

        console.log('2');
    }
    else {
        // Get other info    

        if (objectIdType !== 'str') {
            let loc = (objectIdType === 'global') ? node.context().global : data;
            objectId = helper.getByString(loc, config.objectId);
        }
        if (objectObjectType !== 'json') {
            let loc = (objectObjectType === 'global') ? node.context().global : data;
            objectObject = helper.getByString(loc, config.objectObject);
        }
        else objectObject = JSON.parse(objectObject);
    }


    // Process research

    try { 
        let json = await processRequest(token, instance, objectId, action, objectObject, object, querySelect, queryWhere);
        data.payload = JSON.parse(json);
        data.payload.token = token;
        return node.send(data);
    }
    catch (err) {
        if (err.statusCode === 401) {
            try { 
                let json = await getToken(sfConfig.id, sfConfig.secret, sfConfig.refresh);
                let key = JSON.parse(json).access_token;

                json = await processRequest(key, instance, objectId, action, objectObject, object, querySelect, queryWhere);
                data.payload = JSON.parse(json);
                data.payload.token = key;

                return node.send(data);
            }
            catch (err) {
                if (String(err).match(/Unexpected end of JSON input/)) return node.send(data);
                return node.error(err); }
        }
        else {
            if (String(err).match(/Unexpected end of JSON input/)) return node.send(data);
            else return node.error(err); 
        }
    }
}


async function processRequest (token, instance, objectId, action, objectObject, object, select, where) {
    var url = instance + "/services/data/v20.0/sobjects/" + object + "/";
    
    let req = {
        method: action,
        uri: url,
        headers: {  
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    };

    if (action === "POST") req.body = (typeof objectObject === 'object') ? JSON.stringify(objectObject) : objectObject ;
    else if (action === "PATCH") {
        req.uri  = url + objectId;
        req.body = (typeof objectObject === 'object') ? JSON.stringify(objectObject) : objectObject ;
    }
    else if (action === "QUERY") {
        delete req.headers['Content-Type'];
        req.method = "GET";
        req.uri = instance + "/services/data/v20.0/query/?q=SELECT+ " + select + "+from+" + object + "+WHERE+" + where;
    }
    else if (action === "GET") req.uri = url + objectId;
    else {
        req.uri = url + objectId;
        delete req.headers['Content-Type'];
    }

    console.log(req);

    return request(req);
}

async function getToken (clientid, clientsec, refresh) {
    let req = {
        method: 'POST',
        uri: 'https://login.salesforce.com/services/oauth2/token',
        formData: {
            grant_type: 'refresh_token',
            client_secret: clientsec,
            client_id: clientid,
            refresh_token: refresh
        }
    };
    return request(req);
}