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
        this.on('input', (data)  => { input(RED, node, data, config)  });
    }
    RED.nodes.registerType("inbenta-request", register, {});
}

async function input (RED, node, data, config) {

    // Log activity
    try { setTimeout(function() { helper.trackActivities(node)},0); }
    catch(err) { console.log(err); }

    // Get values
    let ibConfig = helper.getContextValue(RED, node, data, config.ibConfig, config.ibConfigType);
    if (!ibConfig.match(/^https:\/\//i)) return node.error("URL should begin with 'https://'");
    else ibConfig = ibConfig.replace(/\/+$/, "");

    let action = config.action;
    if (action === "search") {
        let question = helper.getContextValue(RED, node, data, config.question, config.questionType);
        try {
            let json = await searchRequest(ibConfig + "/?action=search&q=" + question);
            data.payload = JSON.parse(json);
            return node.send(data);
        }
        catch(err) { return node.error(err); }
    }

    else if (action === "click") {
        let objectId = helper.getContextValue(RED, node, data, config.objectId, config.objectIdType);       
        try {
            let json = await searchRequest(ibConfig + "/?idata=" + objectId + "&action=click");
            data.payload = JSON.parse(json);
            return node.send(data);
        }
        catch(err) { return node.error(err); }
    }

    else if (action === "rate") {
        let rating = helper.getContextValue(RED, node, data, config.objectRating, config.objectRatingType); 
        let comment = helper.getContextValue(RED, node, data, config.objectComment, config.objectCommentType);
        if (comment === undefined || typeof comment !== 'string') comment = '';
        
        try {
            let json = await searchRequest(ibConfig + "/?action=rating-content&idata=" + rating + comment);
            data.payload = JSON.parse(json);
            return node.send(data);
        }
        catch(err) { return node.error(err); }
    }
}

async function searchRequest(url) {
    
    let req = {
        method: "GET",
        uri: url
    };

    return request(req);
}