"use strict";

// Retrieve server
const helper = require("node-red-viseo-helper");
const { initConnector } = require("./msbot/actions.js");

const DEFAULT_TYPING_DELAY = 2000;
const MINIMUM_TYPING_DELAY = 200;

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
  const register = function(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    let globalTypingDelay = DEFAULT_TYPING_DELAY;
    if (config.delay) {
      globalTypingDelay =
        typeof config.delay !== "number" ? Number(config.delay) : config.delay;
      if (globalTypingDelay < MINIMUM_TYPING_DELAY)
        globalTypingDelay = MINIMUM_TYPING_DELAY;
    }

    config.appId = node.credentials.appId;
    config.appPassword = node.credentials.appPassword;
    config.rootAppId = node.credentials.rootAppId;

    start(node, config, RED);
    
    this.on("close", done => {
      stop(node, done);
    });
  };
  RED.nodes.registerType("bot", register, {
    credentials: {
      appId: { type: "text" },
      appPassword: { type: "text" }
    }
  });
};

// ------------------------------------------
// SERVER
// ------------------------------------------

let REPLY_HANDLER = {};
let server;

async function start(node, config, RED) {

  if (REPLY_HANDLER[node.id]) {
    helper.removeListener("reply", REPLY_HANDLER[node.id]);
  }
  
  server = RED.httpNode;

  let { handleReceive, reply, skillEndpoint } = await initConnector(config, node, config.startCmd);

  server.post("/api/messages", (req, res) => {
    handleReceive(req, res);
  });

  // The bot defines an endpoint that forwards incoming skill activities to the root bot's skill handler
  if (!config.rootAppId) skillEndpoint.register(server, '/api/skills');
  
  node.status({ fill: "green", shape: "dot", text: "connected" });

  REPLY_HANDLER[node.id] = (node, data, globalTypingDelay) => {
    reply(node, data, globalTypingDelay);
  };
  helper.listenEvent("reply", REPLY_HANDLER[node.id]);
}

// Stop server
const stop = (node, done) => {
  helper.removeListener("reply", REPLY_HANDLER[node.id]);
  done();
};
