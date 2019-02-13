'use strict';

const helper  =     require('node-red-viseo-helper');
const request =     require('request-promise');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function (RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);

        if (config.version === "v2") {
            config.tokenv2 = RED.nodes.getNode(config.tokenv2);
        }
        else {
            config.tokenv1 = RED.nodes.getCredentials(config.tokenv1);
        }

        let node = this;
        this.on('input', (data)  => { input(RED, node, data, config); });
    }
    RED.nodes.registerType('dialogflow', register, {});
};

async function input (RED, node, data, config) {

    // Log activity
    try { setTimeout(function() { helper.trackActivities(node)},0); }
    catch(err) { console.log(err); }

    let version = config.version || "v1",
        action  = config.action  || "query",
        output  = config.intent  || "payload";

    // ----> MANAGE INTENTS AND ENTITIES

    if (action === "manage") {

        let selaction =  config.selaction  || "get";
        let itemid = helper.getContextValue(RED, node, data, config.itemid, config.itemidType); 
        let object = helper.getContextValue(RED, node, data, config.object, config.objectType); 
        let actionitem = selaction.match(/add|upd/i) ? config.actionitemaddupd : config['actionitem' + selaction];

        // VERSION 2
        if (version === "v2") {  // VERSION 2
            try {
                config.tokenv2.authenticate((client, token) => {
                    
                    let key = token.value;
                    let url = "https://dialogflow.googleapis.com/v2beta1/projects/" + config.tokenv2.cred.project_id + "/agent/";
                        url += (actionitem.match(/entities/i)) ? "entityTypes" : "intents";

                    let req = {
                        method: "POST",
                        uri: url,
                        headers: {  
                            'Authorization': 'Bearer ' + key
                        }
                    };
            
                    if (selaction === "get") {
                        req.method = "GET";
                        req.uri += (actionitem.match(/single/i)) ? "/" + itemid : "";
                    }
                    else if (selaction.match(/add|upd/i)) {
                        req.body = (typeof object === 'object') ? JSON.stringify(object) : object ;
                        req.headers["Content-Type"] = "application/json; charset=utf-8";

                        if      (actionitem.match(/entries/i)) {
                            req.uri += "/" + itemid + "/entities:batch";
                            req.uri += (selaction === "add") ? "Create" : "Update";
                        }
                        else if (actionitem.match(/multiple/i)) req.uri += ":batchUpdate";
                        else if (selaction === "add") req.method = "POST";
                        else {
                            req.method = "PATCH";
                            req.uri += "/" + itemid;
                        }
                    }
                    else {
                        if (actionitem.match(/entries|multiple/i)) {
                            req.body = (typeof object === 'object') ? JSON.stringify(object) : object ;
                            req.headers["Content-Type"] = "application/json";
                            req.uri += (actionitem.match(/entries/i)) ? "/" + itemid + "/entities:batchDelete" : ":batchDelete";
                        } 
                        else {
                            req.method = "DELETE";
                            req.uri += "/" + itemid;
                        }
                    }

                    request(req)
                    .then( function (result) {
                        helper.setByString(data, output, result);
                        return node.send([data, undefined]);
                    })
                    .catch( function (err) {
                        node.error(err);
                        return node.send([undefined, data]);
                    })
                })
            }
            catch (err) { 
                node.error(err); 
                return node.send([undefined, data]);
            }
        }
        else {                  // VERSION 1
            try {
                let result = await manageRequest(config.tokenv1.devtoken, actionitem, selaction, itemid, object);
                helper.setByString(data, output, result);
                return node.send([data, undefined]);
            }
            catch(err) {
                node.error(err);
                return node.send([undefined, data]);
            }
        }
    }

    else {
        let session  = helper.getContextValue(RED, node, data, config.session || "user.id", config.sessionType);
        let language = helper.getContextValue(RED, node, data, config.language || "en", config.languageType);
        let text     = helper.getContextValue(RED, node, data, config.text || "payload", config.textType);

        if (version === "v2") {  // VERSION 2
            try {
                config.tokenv2.authenticate((client, token) => {

                    let key = token.value,
                        sessionPath = "projects/" + config.tokenv2.cred.project_id + "/agent/sessions/" + session;

                    let req = {
                        method: "POST",
                        uri: "https://dialogflow.googleapis.com/v2beta1/" + sessionPath + ":detectIntent",
                        headers: {  
                            'Authorization': 'Bearer ' + key,
                            'Content-Type':  'application/json; charset=utf-8'
                        },
                        body: JSON.stringify({
                            session: session,
                            queryInput: {
                                text: {
                                    text: text,
                                    languageCode: language
                                }
                            }
                        })
                    };

                    request(req)
                    .then( function (result) {

                        result = JSON.parse(result);
                        let formattedResponse = {
                            query: result.queryResult.queryText ,
                            intent: result.queryResult.action || result.queryResult.intent.displayName,
                            score: result.queryResult.intentDetectionConfidence,
                            entities: result.queryResult.parameters,
                            source: "dialogflow",
                            completeResponse: result
                        }

                        helper.setByString(data, output, formattedResponse);
                        return node.send([data, undefined]);
                    })
                    .catch( function (err) {
                        node.error(err);
                        return node.send([undefined, data]);
                    })
                    
                })

            }
            catch (err) { 
                node.error(err);
                return node.send([undefined, data]);
            }
        }
        else {                   // VERSION 1 

            let key =   config.tokenv1.clienttoken;

            try {
                let result = await queryRequest(key, session, text, language);
                    result = JSON.parse(result);

                let formattedResponse = {
                    query: result.result.resolvedQuery,
                    intent: (result.result.action) ? result.result.action : result.result.metadata.intentName,
                    score: result.result.score,
                    entities: result.result.parameters,
                    source: "dialogflow",
                    completeResponse: result
                }

                helper.setByString(data, output, formattedResponse);
                return node.send([data, undefined]);
            } 
            catch (err) { 
                node.error(err);
                return node.send([undefined, data]);
            }
        }
    }
};

async function queryRequest(token, session, text, language) {

    let url = "https://api.dialogflow.com/v1/query?v=20150910";

    let req = {
        method: "POST",
        uri: url,
        headers: {  
            'Authorization': 'Bearer ' + token,
            'Content-Type':  'application/json; charset=utf-8'
        },
        body: JSON.stringify({
            "query": text,
            "lang": language,
            "sessionId": session
        })
    };

    return request(req);
}

async function manageRequest(token, actionitem, selaction, itemid, object) {

    let url = "https://api.dialogflow.com/v1/";
        url += (actionitem.match(/entities/i)) ? "entities/" : "intents/";

    let req = {
        method: selaction.toUpperCase(),
        uri: url,
        headers: {  
            'Authorization': 'Bearer ' + token
        }
    };

    if (selaction === "get") {
        req.uri += (actionitem.match(/single/i)) ? itemid : "";
    }
    else if (selaction === "add") {
        req.body = (typeof object === 'object') ? JSON.stringify(object) : object ;
        req.headers["Content-Type"] = "application/json; charset=utf-8";
        req.method = (actionitem.match(/multiple/i)) ? "PUT" : "POST";
        req.uri += (actionitem.match(/entries/i)) ? itemid + "/entries" : "";
    }
    else if (selaction === "upd") {
        req.body = (typeof object === 'object') ? JSON.stringify(object) : object ;
        req.headers["Content-Type"] = "application/json";
        req.method = "PUT";
        req.uri += (actionitem.match(/multiple/i)) ? "" : itemid;
        req.uri += (actionitem.match(/entries/i))  ? "/entries" : "";
    }
    else {
        req.method = "DELETE";
        if (actionitem.match(/entries/i)) {
            req.body = (typeof object === 'object') ? JSON.stringify(object) : object ;
            req.headers["Content-Type"] = "application/json";
            req.uri += itemid + "/entries";
        } 
        else req.uri += itemid;
    }
    
    req.uri += "?v=20150910";

    return request(req);
}