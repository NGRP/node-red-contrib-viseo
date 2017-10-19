'use strict';

const helper  = require('node-red-viseo-helper');
const request = require('request-promise');


// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function (RED) {
    const register = function (config) {
        RED.nodes.createNode(this, config);
        config.tokens = RED.nodes.getCredentials(config.token);
        let node = this;
        this.on('input', (data)  => { input(node, data, config); });
    }
    RED.nodes.registerType('dialogflow', register, {});
};

async function input (node, data, config) {
    let key =    config.tokens.clienttoken,
        token =  config.tokens.devtoken,
        action = config.action,
        output = config.intent || "payload",
        outLoc = (config.intentType === 'global') ? node.context().global : data;

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
        else object = JSON.parse(object);

        try {
            let result = await manageRequest(token, actionitem, selaction, itemid, object);
            helper.setByString(outLoc, output, JSON.parse(result));
            return node.send(data);
        }
        catch(err) {
            return node.error(err); 
        }
    }

    let session =  config.session   || "user.id",
        language = config.language  || "en",
        text =     config.text      || "payload";

    if (config.languageType !== 'str') {
        let loc = (config.languageType === 'global') ? node.context().global : data;
        language = helper.getByString(loc, language); }
    if (config.sessionType !== 'str') {
        let loc = (config.sessionType === 'global') ? node.context().global : data;
        session = helper.getByString(loc, session); }
    if (config.textType !== 'str') {
        let loc = (config.textType === 'global') ? node.context().global : data;
        text = helper.getByString(loc, text); }

    try {
        let result = await queryRequest(key, session, text, language);
        helper.setByString(outLoc, output, JSON.parse(result));
        return node.send(data);
    } 
    catch (err) { 
        return node.error(err); 
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
    else if (selaction === "update") {
        req.body = (typeof object === 'object') ? JSON.stringify(object) : object ;
        req.method = "PUT";
        req.uri += (actionitem.match(/multiple/i)) ? "" : itemid;
        req.uri += (actionitem.match(/entries/i))  ? "/entries" : "";
    }
    else {
        req.uri += (actionitem.match(/entries/i)) ? itemid + "/entries" : itemid;
    }
    
    req.uri += "?v=20150910";

    return request(req);
}