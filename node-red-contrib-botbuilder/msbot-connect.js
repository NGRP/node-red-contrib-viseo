"use strict";

// Retrieve server
const helper = require("node-red-viseo-helper");
const { initConnector } = require("./msbot/actions.js");

const DEFAULT_TYPING_DELAY = 2000;
const MINIMUM_TYPING_DELAY = 200;

let REPLY_HANDLER = {};
let server;
let allowedCallers = '';

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------
const getAllowedCallers = (node, data, config) => {
  let result = '';
  const bType = config.botType;
  const ac = config.allowedCallers;
  const acType = config.allowedCallersType;

  if (bType === 'rootBot' || bType === 'skillBot') {
    if (acType === '' || ac === '') {
      throw new Error('[BotBuilder]  Param allowedCallers missing');
    }

    switch (acType) {
      case 'msg':
        result = data[ac];
        break;
      case 'global':
        result = node.context().global.get(ac);
        break;
      case 'json':
        result = JSON.parse(ac);
        break;
      case 'flow':
        result = node.context().flow.get(ac);
        break;
    }
  }
  return result;
};
 
module.exports = function(RED) {
  const register = function(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.status({});

    let globalTypingDelay = DEFAULT_TYPING_DELAY;
    if (config.delay) {
      globalTypingDelay =
        typeof config.delay !== "number" ? Number(config.delay) : config.delay;
      if (globalTypingDelay < MINIMUM_TYPING_DELAY)
        globalTypingDelay = MINIMUM_TYPING_DELAY;
    }
    config.appId = node.credentials.appId;
    config.appPassword = node.credentials.appPassword;

    // require an input to start bot
    const startDelayed = config.startDelayedbyInput;
    if (startDelayed) {
      this.on("input", (data) => {
        try {
          allowedCallers = getAllowedCallers(node, data, config);
          start(node, config, RED);
          
        } catch (error) {
          console.error(`[Botbuilder] register: ${error}`);
          return node.status({ fill: "red", shape: "dot", text: `${error}` });
        }
      });
    } else {
      allowedCallers = config.allowedCallers;
      start(node, config, RED);
    }

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
async function start(node, config, RED) {
  if (REPLY_HANDLER[node.id]) {
    helper.removeListener("reply", REPLY_HANDLER[node.id]);
  }
  
  server = RED.httpNode;
  
  try {
    let { handleReceive, reply, skillEndpoint, bot } = await initConnector(config, node, allowedCallers);
    module.exports.botbuilder = bot;

    server.get("/api/messages", (req, res, next) => {
      res.send("Hello I'm a bot !");
      return next();
    });

    // bot framework v4 messaing endpoint
    server.post("/api/messages", (req, res) => {
      handleReceive(req, res);
    });

    // The bot defines an endpoint that forwards incoming skill activities to the root bot's skill handler (skill host endpoint)
    if (config.botType === 'rootBot' && skillEndpoint) {
      // expose skill host endpoint
      server.post("/api/skills/v3/conversations/:conversationId/activities/:activityId");
      skillEndpoint.register(server, '/api/skills');
    }

    REPLY_HANDLER[node.id] = (node, data, globalTypingDelay) => {
      reply(node, data, globalTypingDelay);
    };
    helper.listenEvent("reply", REPLY_HANDLER[node.id]);

    node.status({ fill: "green", shape: "dot", text: "connected" });
  } catch (error) {
    console.error(`[Botbuilder] start: ${error}`);
    node.status({ fill: "red", shape: "dot", text: `${error}` });
    throw error;
  }
}

// Stop server
const stop = (node, done) => {
  helper.removeListener("reply", REPLY_HANDLER[node.id]);
  done();
};
