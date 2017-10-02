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
        this.on('input', (data)  => { input(node, data, config)  });
    }
    RED.nodes.registerType("inbenta-request", register, {});
}

async function input (node, data, config) {

    console.log(config)

    // Get values
    let ibConfig = config.ibConfig,
        action = config.action,
        ibConfigType = config.ibConfigType;
    
    if (ibConfigType !== 'str') {
        let loc = (ibConfigType === 'global') ? node.context().global : data;
        ibConfig = helper.getByString(loc, ibConfig);
    }
    if (!ibConfig.match(/^https:\/\//i)) return node.error("URL should begin with 'https://'");
    else ibConfig = ibConfig.replace(/\/+$/, "");

    if (action === "search") {
        let question = config.question,
            questionType = config.questionType;

        if (questionType !== 'str') {
            let loc = (questionType === 'global') ? node.context().global : data;
            question = helper.getByString(loc, question);
        }

        try {
            let json = await searchRequest(ibConfig + "/?action=search&q=" + question);
            data.payload = JSON.parse(json);
            return node.send(data);
        }
        catch(err) { return node.error(err); }
    }

    else if (action === "click") {
        let objectId = config.objectId,
            objectIdType = config.objectIdType;

        if (objectIdType !== 'str') {
            let loc = (objectIdType === 'global') ? node.context().global : data;
            objectId = helper.getByString(loc, objectId);
        }
        
        try {
            let json = await searchRequest(ibConfig + "/?idata=" + objectId + "&action=click");
            data.payload = JSON.parse(json);
            return node.send(data);
        }
        catch(err) { return node.error(err); }
    }

    else if (action === "rate") {
        let rating = config.objectRating,
            comment = config.objectComment,
            ratingType = config.objectRatingType,
            commentType = config.objectCommentType;

        if (ratingType !== 'str') {
            let loc = (ratingType === 'global') ? node.context().global : data;
            rating = helper.getByString(loc, rating);
        }
        if (commentType !== 'str') {
            let loc = (commentType === 'global') ? node.context().global : data;
            comment = helper.getByString(loc, comment);
        }
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