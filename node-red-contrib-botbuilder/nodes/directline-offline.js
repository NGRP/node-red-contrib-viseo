"use strict";

const directline = require("offline-directline");
const express    = require("express");
const fs         = require('fs')

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {

    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
        node.status({fill:"red", shape:"dot", text: "Not connected"});

        start(node, config, RED);
        this.on('close', (done) => { stop(node, config, done) });
    }

    RED.nodes.registerType("msbot-offline", register, {});
}

let CONNECTORS = {};
let NBUSERS = {};
let start = (node, config, RED) => {

    let host = config.host || "http://127.0.0.1:1880";
    let server = config.express || "http://127.0.0.1:3000";
    let endpoint = config.endpoint || "/api/v1/messages";
    let webchat = config.webchat || "/offchat";

    if (!CONNECTORS[node.id]) connectServer(node, server, host, endpoint);
    node.status({fill:"green", shape:"dot", text:"Connected"});

    let css = (config.css) ? '<link href="' + css + '" rel="stylesheet" />    ' : "";
    let start = config.start || "getstarted";

    let data = '<!DOCTYPE html><html>  <head>    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=0, minimum-scale=1.0, maximum-scale=1.0">    ' +
                '<script src="https://code.jquery.com/jquery-1.12.4.min.js"  integrity="sha256-ZosEbRLbNQzLpnKIkEdrPv7lOy9C27hHQ+Xp8a4MxAQ="  crossorigin="anonymous"></script>      ' +
                '<link href="' + host + webchat + '/lib?doc=bot.css" rel="stylesheet" />    ' + css + '<script src="' + host + webchat + '/lib?doc=bot.js"></script>    ' + 
                '<script src="' + host + webchat + '/lib?doc=index.js"></script>      <title>' + config.title + '</title>  </head>  <body>    <div id="page-content" data-url="http:&#x2F;&#x2F;127.0.0.1:1880">        ';

    RED.httpNode.get (webchat + "/lib",   (req, res, next) => {
        if (!req.query || !req.query.doc) return res.end();
        let data = fs.readFileSync(__dirname + "/lib/" + req.query.doc, 'utf8');
        res.end(data);
    });

    RED.httpNode.get (webchat,   (req, res, next) => {
        
        let userid = Math.random().toString(36).substring(7);
        console.log("GET HERE " + userid)
        let myData = '<div id="bot" data-user="' + userid + '" data-start="' + start + '"/>' + '    </div>  </body></html>';

        res.setHeader('Content-Type', 'text/html; charset=utf-8 '); 
        res.end(data + myData);
    });
}



let connectServer = (node, server, host, endpoint) => {
    let app = CONNECTORS[node.id] = express();
    NBUSERS[node.id] = 0;
    directline.initializeRoutes(app, server, host + endpoint);
}

const stop = (node, config, done) => {
    done();
}