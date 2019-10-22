"use strict";

// Retrieve server
const helper = require("node-red-viseo-helper");
const server = require("./msbot/server.js");
const { receive, reply } = require("./msbot/actions.js");

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
async function start(node, config, RED) {
  // Restart server

  if (REPLY_HANDLER[node.id])
    helper.removeListener("reply", REPLY_HANDLER[node.id]);
  server.stop();

  // Main behavior
  let bot = await server.start(config, node, RED);
  node.status({ fill: "green", shape: "dot", text: "connected" });

  // Handle incoming message
  bot.onMessage(async (context, next) => {
    await new Promise(function(resolve, reject) {
      receive(node, config, context, next, resolve, reject);
    });
  });

  // Handle all replies
  REPLY_HANDLER[node.id] = (node, data, globalTypingDelay) => {
    reply(node, data, globalTypingDelay)
      .then(function(context) {
        helper.fireAsyncCallback(data);
        context.resolve();
        context.next();
      })
      .catch(function(err) {
        console.log("[BotBuilder]", err);
      });
  };
  helper.listenEvent("reply", REPLY_HANDLER[node.id]);
}

// Stop server
const stop = (node, done) => {
  helper.removeListener("reply", REPLY_HANDLER[node.id]);
  server.stop();
  done();
};
