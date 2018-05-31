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

    RED.nodes.registerType("node-youtube-playlist", register, {});

}


const start = (RED, node, config) => {
    node.account = RED.nodes.getNode(config.account);
};

const input = (node, data, config) => {

    let playlist = ""
    if(config.playlistIdType === "msg") {
        playlist = helper.getByString(data, config.playlistId, "")
    } else {
        playlist = config.playlistId
    }


    let service = googleapis.youtube('v3');

    service.playlistItems.list({
        playlistId: playlist,
        maxResults: config.maxResults,
        part: "snippet",
        auth: node.account.credentials.key

    }, function(err, response) {
        if (err) {
          node.error('The API returned an error: ' + err);
          return node.send([ undefined, data ]);
        }

        data.payload = response;
        node.send([ data, undefined ]);
    })

};

const stop = (done) => {
    //nothing to do.
    done();
};