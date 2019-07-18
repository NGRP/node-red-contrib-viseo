const request = require('request-promise');
const helper  = require('node-red-viseo-helper');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        
        RED.nodes.createNode(this, config);
        
        let node = this;
        node.config = RED.nodes.getNode(config.sfConfig);
        
        this.on('input', (data)  => { input(RED, node, data, config)  });
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


const input = async (RED, node, data, config) => {

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

        [ querySelect, queryWhere ] = prepareQuery(RED, node, data, config)

        if(!queryWhere) {
            data.error = "Request not sent because of invalid Where clause."
            node.error(data.error)
            return node.send([undefined, data]);
        }
    } else if(["GET", "PATCH", "POST", "DELETE"]) {
        [ objectId, objectObject ] = prepareRequest(RED, node, data, config)
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

        return node.send([data, undefined]);
    }
    catch (err) {

        if (err.statusCode === 401 && node.config.refreshToken()) { //access_token expiry
            
            run(node, data, action, objectId, objectObject, object, querySelect, queryWhere)
            
        } else { 
            data.error = err.message;
            if (String(err).match(/Unexpected end of JSON input/)) {
                return node.send([undefined, data]);
            } else {
                node.error(err);
                node.send([undefined, data]);
            }
        }
    }
}

const prepareQuery = (RED, node, data, config) => {

    let queryWhereArray = [],
        queryWhere;

    // Get query info
    let querySelect = helper.getContextValue(RED, node, data, config.querySelect, config.querySelectType);
    querySelect = querySelect.replace(/ /g,'');
    querySelect = querySelect.replace(/,/g,'+,+');


    if (config.queryWhere) {

        let error = false

        let wheres = []
        let regex = /([A-Za-z]+)\[([0-9]+)\]/
                
        for(let object of JSON.parse(config.queryWhere)) {
            let parseResult = object.name.match(regex)

            if(parseResult.length === 0) {
                continue;
            }

            if (wheres[parseResult[2]] === undefined) {
                wheres[parseResult[2]] = {}
            }
            wheres[parseResult[2]][parseResult[1]] = object.value

        }

        wheres:
        for(let where of wheres) {

            if(!where) {
                continue;
            }

            let value = where.value
            let field = where.field
            let comp = '='

            switch (where.comp) {
                case 'lt':
                    comp = '<';
                    break;
                case 'lte':
                    comp = '<=';
                    break;
                case 'neq':
                    comp = '!=';
                    break;
                case 'eq':
                    comp = '=';
                    break;
                case 'gte':
                    comp = '>=';
                    break;
                case 'gt':
                    comp = '>';
                    break;
            }

            switch(where.fieldType) {
                case 'msg':
                    field = helper.getByString(data, field);
                    break;
                case 'global':
                    field = node.context().global.get(field);
                    break;
            }

            switch(where.valueType) {
                case 'msg':
                    value = helper.getByString(data, value);
                    break;
                case 'global':
                    value = node.context().global.get(value);
                    break;
                case 'datetime':
                    if(/[0-9]{4}\-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z/.test(value) == false) {
                        node.error("Date expected format is 'YYYY-MM-DDTHH:MM:SSZ' UTC (ex: '2019-01-23T09:00:00Z')");
                        error = true
                        break wheres;
                    }
                    break;
            }
            if(where.valueType !== 'datetime') {
                value = "'"+value+"'";
            }

            if(field == undefined) {
                node.error("field '"+where.field+"' is undefined.");
                error = true;
                break;
            }

            queryWhereArray.push(field+'+'+comp+'+'+value);
        }

        
        if(!error) {
            queryWhere = queryWhereArray.join('+AND+')
        }

    }

    return [ querySelect, queryWhere ]
}

const prepareRequest = (RED, node, data, config) => { 

    // let objectLabel = config.objectLabel;
    let objectId = helper.getContextValue(RED, node, data, config.objectId, config.objectIdType);
    let objectObject = helper.getContextValue(RED, node, data, config.objectObject, config.objectObjectType);

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