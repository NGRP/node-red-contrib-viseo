const request = require('request-promise');
const extend  = require('extend');
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        
        RED.nodes.createNode(this, config);
        
        let node = this;
        node.config = RED.nodes.getNode(config.sfConfig);
        
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("salesforce-object", register, {});
}


const start = (node, config) => {

    if (config.object === "else") {
        if (config.objectLabel === "" || config.objectLabel === undefined)  {
            node.status({ fill: "red", shape: "ring", text: "An object label must be specified" });
            return
        }
    }

    node.status({})
}


const input = async (node, data, config) => {

    // Get values
    // Process research
    
    let action = config.action.toUpperCase(),
        object = config.object,
        objectLabel = config.objectLabel,
        querySelect, queryWhere,
        objectId, objectObject;

    if (object === "else") {
        object = objectLabel;
    }

    if(action === "QUERY") {
        [ querySelect, queryWhere ] = prepareQuery(data, config)
    } else if(["GET", "PATCH", "POST", "DELETE"]) {
        [ objectId, objectObject ] = prepareRequest(data, config)
    }


    run(node, data, action, objectId, objectObject, object, querySelect, queryWhere)
}

const run = async (node, data, action, objectId, objectObject, object, querySelect, queryWhere) => {

    if(node.config.token === undefined) {
        if(node.config.refreshToken() === false) {
            node.error("Missing access token");
            return;
        }
    }

    try { 

        let json = await processRequest(action, node.config.token, node.config.credentials.instance, node.config.version, objectId, objectObject, object, querySelect, queryWhere);
        data.payload = JSON.parse(json);

        return node.send(data);
    }
    catch (err) {

        if (err.statusCode === 401 && node.config.refreshToken()) { //access_token expiry
            
            run(node, data, action, objectId, objectObject, object, querySelect, queryWhere)
            
        } else { 

            if (String(err).match(/Unexpected end of JSON input/)) {
                return node.send(data);
            } else {
                return node.error(err);
            }
        }
    }
}

const prepareQuery = (data, config) => {

    let querySelect = config.querySelect,
        queryWhere = config.queryWhere,
        queryEquals = config.queryEquals;


    // Get query info
    let querySelectType = config.querySelectType,
        queryWhereType = config.queryWhereType,
        queryEqualsType = config.queryEqualsType;


    if (querySelectType !== 'str') {
        let loc = (querySelectType === 'global') ? node.context().global : data;
        querySelect = helper.getByString(loc, querySelect);
    }
    querySelect = querySelect.replace(/ /g,'');
    querySelect = querySelect.replace(/,/g,'+,+');


    if(queryWhere) {

        if (queryWhereType !== 'str') {
            let loc = (queryWhereType === 'global') ? node.context().global : data;
            queryWhere = helper.getByString(loc, queryWhere);
        }
        if (queryEqualsType !== 'str') {
            let loc = (queryEqualsType === 'global') ? node.context().global : data;
            queryEquals = helper.getByString(loc, queryEquals);
        }

        queryWhere += "+=+'" + queryEquals + "'";
    }

    return [ querySelect, queryWhere ]
}

const prepareRequest = (data, config) => { 

    
    let objectId = config.objectId,
        objectLabel = config.objectLabel,
        objectObject = config.objectObject;

    let objectIdType = config.objectIdType,
        objectObjectType = config.objectObjectType;

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

    return [ objectId, objectObject ]
}


const processRequest = (action, token, instance, version, objectId, objectObject, object, select, where) => {

    var url = instance + "/services/data/" + version + "/sobjects/" + object + "/";
    
    let req = {
        headers: {  
            'Authorization': 'Bearer ' + token
        }
    };

    //set URI
    if(["POST"].includes(action)) {
        req.uri = url
    } else if(["QUERY"].includes(action)) {
        req.uri = instance + "/services/data/" + version + "/query/?q=SELECT+ " + select + "+from+" + object;
        if(where)  {
            req.uri += "+WHERE+" + where;
        }

    } else if(["DESCRIBE"].includes(action)) {
        req.uri = url + "describe";
    } else {
        req.uri = url + objectId;
    }

    //set Content Type
    if(["GET", "PATCH", "POST", "DESCRIBE"].includes(action)) {
        req.headers["Content-Type"] = 'application/json';
    }

    //set Content
    if(["POST", "PATCH"].includes(action)) {
        req.body = (typeof objectObject === 'object') ? JSON.stringify(objectObject) : objectObject ;
    }

    //set method
    if(["QUERY", "DESCRIBE"].includes(action)) {
        req.method = "GET";
    } else {
        req.method = action;
    }


    return request(req);
}