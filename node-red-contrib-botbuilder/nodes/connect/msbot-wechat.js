"use strict";

const helper    = require('node-red-viseo-helper');
const builder   = require('botbuilder');
const connector = require('./msbot-wechat-connector.js');
const event     = require('../../lib/event.js');
const msbot     = require('../../lib/msbot.js');
const srv       = require('../../lib/server.js');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        start(RED, node, config);
        this.on('input', (data)  => { input(node, data, config)  });
        this.on('close', (cb)    => { stop(node, cb, config)     });
    }
    RED.nodes.registerType("wechat", register, {});
}

let bot;
let BOT_CONTEXT = {};
const start = (RED, node, config) => {

    // Add ChatBot connector
    let wechatConnector = new connector.WechatConnector({
        appID:     config.appID,
        appSecret: config.appSecret,
        appToken:  config.appToken
    });

    // Bind webhook
    let server = RED.httpNode
    server.use('/wechat', wechatConnector.listen())

    // Our custom logic
    wechatConnector.postMessageHook((wechatAPI, message, atmType, atmCont, user) => {

        console.log('--- WECHAT ----------------------------')
        console.log(atmType)
        console.log(atmCont)
        console.log('---------------------------------------')

        switch(atmType) {
            case AttachmentType.Hero:

            let json = []
            let item = atmCont
            json.push({
                    title : item.title,
                    description: item.subtitle,
                    picurl: item.images[0] ? item.images[0].url : undefined
            })
            
            this.wechatAPI.sendNews(user.id, json, errorHandle);
            break;
        }
    })

    // Build new bot
    bot = srv.bindConnector(wechatConnector);
    node.status({fill:"green", shape:"dot", text:"connected"});

    // Root Dialog
    msbot.bindDialogs(bot, (err, data, type) => {
        if (type === 'received'){ node.send(data) }
    });
}

const stop = (node, cb, config) => { cb(); }

const input = (node, data, config) => {
    if (!wechatAPI) return node.send(data);
}
