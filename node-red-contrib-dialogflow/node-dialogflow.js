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
        this.on('input', (data)  => { input(node, data, config); });
    }
    RED.nodes.registerType('dialogflow', register, {});
};

async function input (node, data, config) {
    console.log("INPUT \n")
    let version = config.version || "v1",
        action = config.action || "query",
        output = config.intent || "payload",
        outLoc = (config.intentType === 'global') ? node.context().global : data;

    // ----> MANAGE INTENTS AND ENTITIES

    if (action === "manage") {

        let selaction =  config.selaction  || "get",
            itemid =     config.itemid,
            object =     config.object;

        let actionitem = selaction.match(/add|upd/i) ? config.actionitemaddupd : config['actionitem' + selaction];

        if (config.itemidType !== 'str') {
            let loc = (config.itemidType === 'global') ? node.context().global : data;
            itemid = helper.getByString(loc, itemid); }
        if (config.objectType !== 'json') {
            let loc = (config.objectType === 'global') ? node.context().global : data;
            object = helper.getByString(loc, object); }
        else {
            try   { object = JSON.parse(object); }
            catch (err) { return node.error(err); }
        } 

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
                        helper.setByString(outLoc, output, JSON.parse(result));
                        return node.send(data);
                    })
                    .catch( function (err) {
                        return node.error(err);
                    })
                })
            }
            catch (err) { 
                return node.error(err); 
            }
        }
        else {                  // VERSION 1
            try {
                let result = await manageRequest(config.tokenv1.devtoken, actionitem, selaction, itemid, object);
                helper.setByString(outLoc, output, JSON.parse(result));
                return node.send(data);
            }
            catch(err) {
                return node.error(err); 
            }
        }
    }

    else {
        // ----> QUERY : DETECT AN INTENT

        let session =  config.session  || "user.id",
            language = config.language || "en",
            text =     config.text     || "payload";

        if (config.languageType !== 'str') {
            let loc = (config.languageType === 'global') ? node.context().global : data;
            language = helper.getByString(loc, language); }
        if (config.sessionType !== 'str') {
            let loc = (config.sessionType === 'global') ? node.context().global : data;
            session = helper.getByString(loc, session); }
        if (config.textType !== 'str') {
            let loc = (config.textType === 'global') ? node.context().global : data;
            text = helper.getByString(loc, text); }

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
                        helper.setByString(outLoc, output, JSON.parse(result));
                        return node.send(data);
                    })
                    .catch( function (err) {
                        return node.error(err);
                    })
                    
                })

            }
            catch (err) { 
                return node.error(err); 
            }
        }
        else {                   // VERSION 1 

            let key =   config.tokenv1.clienttoken,
            token = config.tokenv1.devtoken;

            try {
            let result = await queryRequest(key, session, text, language);
            helper.setByString(outLoc, output, JSON.parse(result));
            return node.send(data);
            } 
            catch (err) { 
            return node.error(err); 
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