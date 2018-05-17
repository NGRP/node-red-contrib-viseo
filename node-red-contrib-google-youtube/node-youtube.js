'use strict'

const googleapis = require('googleapis');
const helper = require('node-red-viseo-helper');

module.exports = function(RED) {

    const register = function(config) {
        RED.nodes.createNode(this, config);

        let node = this;

        start(RED, node, config);

        this.on('input', (data) => {
            input(node, data, config);
        });
        
        this.on('close', (done) => {
            stop(done);
        });
           
    }

    RED.nodes.registerType("node-youtube", register, {});

}


const start = (RED, node, config) => {
    node.account = RED.nodes.getNode(config.account);
};

const input = (node, data, config) => {

    let query = ""
    if(config.queryType === "msg") {
        query = helper.getByString(data, config.query, "")
    } else {
        query = config.query
    }


    let service = googleapis.youtube('v3');

    service.search.list({
        q: query,
        channelId: config.channelId,
        maxResults: config.maxResults,
        part: "snippet",
        regionCode: config.region,
        auth: node.account.credentials.key,
        order: config.order,
        type: "video"

    }, function(err, response) {
        if (err) {
          node.error('The API returned an error: ' + err);
          return;
        }

        data.payload = response;
        node.send(data);
    })

};

const stop = (done) => {
    //nothing to do.
    done();
};