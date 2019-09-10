const helper = require("node-red-viseo-helper");
const botmgr = require("node-red-viseo-bot-manager");
const uuidv4 = require("uuid/v4");
const cryptoJS = require("crypto-js");
const EventEmitter = require("events");

const CARRIER = "iAdvize";
const VERBOSE = true;

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------

module.exports = function(RED) {
  const register = function(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    config.uiUrl = node.credentials.uiUrl;
    config.botName = node.credentials.botName;
    config.botID = node.credentials.botID;
    config.botToken = node.credentials.botToken;

    start(RED, node, config);
    this.on("close", done => {
      stop(node, config, done);
    });
  };
  RED.nodes.registerType("server-iadvize", register, {
    credentials: {
      botName: { type: "text" },
      botID: { type: "text" },
      botToken: { type: "text" },
      uiUrl: { type: "text" }
    }
  });
};

let emitter;
let token;
let LISTENERS_REPLY = {};
let LISTENERS_TRANSFER = {};
let DELAY = 1000;

const start = (RED, node, config) => {
  // Token
  if (config.botToken) token = config.botToken;

  // Delay
  if (config.delay) DELAY = Number(config.delay) || 1000;

  // Event emitter
  class NodeEmitter extends EventEmitter {}
  emitter = new NodeEmitter();

  /**  --------------------------
   *     EXTERNAL BOT ENDPOINTS
   *   -------------------------- */

  /* 0 - Health verification */

  RED.httpNode.use("/iadvize/health", function(req, res) {
    if (VERBOSE) console.log("[iAdvize] get /health");
    res.send({ status: "UP" });
  });

  /* 1 - Get external bots */
  RED.httpNode.use("/iadvize/external-bots", function(req, res) {
    if (VERBOSE) console.log("[iAdvize] get /external-bots");
    if (!isValidSignature(req.header("X-iAdvize-Signature"), req.body)) {
      if (VERBOSE) console.log("[iAdvize] Security issue: bad signature");
      return res.sendStatus(403).end();
    }

    res.send([
      {
        idBot: config.botID || "bot",
        name: config.name || "bot",
        editorUrl: config.uiUrl
      }
    ]);
  });

  /* 2 - Put bot */
  RED.httpNode.put("/iadvize/bots/:idOperator", function(req, res) {
    if (VERBOSE) console.log("[iAdvize] put /bots/:idOperator");
    if (!isValidSignature(req.header("X-iAdvize-Signature"), req.body)) {
      if (VERBOSE) console.log("[iAdvize] Security issue: bad signature");
      return res.sendStatus(403).end();
    }

    let now = new Date().toISOString();
    res.send({
      idOperator: req.params.idOperator,
      external: {
        idBot: config.botID || "bot",
        name: config.name || "bot",
        editorUrl: config.uiUrl
      },
      distributionRules: req.body.distributionRules,
      createdAt: now,
      updatedAt: now
    });
  });

  /* 3 - Get bot */
  RED.httpNode.use("/iadvize/bots/:idOperator", function(req, res) {
    if (VERBOSE) console.log("[iAdvize] get /bots/:idOperator");
    if (!isValidSignature(req.header("X-iAdvize-Signature"), req.body)) {
      if (VERBOSE) console.log("[iAdvize] Security issue: bad signature");
      return res.sendStatus(403).end();
    }

    let now = new Date().toISOString();
    res.send({
      idOperator: req.params.idOperator,
      external: {
        idBot: config.botID || "bot",
        name: config.name || "bot",
        editorUrl: config.uiUrl
      },
      distributionRules: req.body.distributionRules,
      createdAt: now,
      updatedAt: now
    });
  });

  /* 4 - Get availibility strategies */
  RED.httpNode.use("/iadvize/availability-strategies", function(req, res) {
    if (VERBOSE) console.log("[iAdvize] get /availability-strategies");
    if (!isValidSignature(req.header("X-iAdvize-Signature"), req.body)) {
      if (VERBOSE) console.log("[iAdvize] Security issue: bad signature");
      return res.sendStatus(403).end();
    }

    res.send([
      {
        strategy: "customAvailability",
        availability: true
      }
    ]);
  });

  /**  --------------------------
   *     CONVERSATION ENDPOINTS
   *   -------------------------- */

  /* 1 - Post conversation */
  RED.httpNode.post("/iadvize/conversations", function(req, res) {
    if (!req.body) res.status(400).send({ error: "empty body" });
    if (VERBOSE)
      console.log("[iAdvize] post /conversations, ", req.body.idOperator);
    if (!isValidSignature(req.header("X-iAdvize-Signature"), req.body)) {
      if (VERBOSE) console.log("[iAdvize] Security issue: bad signature");
      return res.sendStatus(403).end();
    }

    let now = new Date().toISOString();
    res.send({
      idConversation: req.body.idConversation,
      idOperator: req.body.idOperator,
      replies: [],
      variables: [],
      createdAt: now,
      updatedAt: now
    });
  });

  /* 2 - Post message */
  RED.httpNode.post("/iadvize/conversations/:conversationId/messages", function(
    req,
    res
  ) {
    if (!req.body) res.status(400).send({ error: "empty body" });
    if (VERBOSE)
      console.log("[iAdvize] post /conversations/:conversationId/messages");
    if (!isValidSignature(req.header("X-iAdvize-Signature"), req.body)) {
      if (VERBOSE) console.log("[iAdvize] Security issue: bad signature");
      return res.sendStatus(403).end();
    }

    receive(node, config, req, res);
  });

  /* 3 - Get conversation */
  RED.httpNode.use("/iadvize/conversations/:conversationId", function(
    req,
    res
  ) {
    if (VERBOSE) console.log("[iAdvize] get /conversations/:conversationId");
    if (!isValidSignature(req.header("X-iAdvize-Signature"), req.body)) {
      if (VERBOSE) console.log("[iAdvize] Security issue: bad signature");
      return res.sendStatus(403).end();
    }

    res.sendStatus(200).end();
  });

  /**  --------------------------
   *     CALLBACKS
   *   -------------------------- */

  RED.httpNode.use("/iadvize/callback", function(req, res) {
    if (VERBOSE) console.log("[iAdvize] get /callback");
    if (!isValidSignature(req.header("X-iAdvize-Signature"), req.body)) {
      if (VERBOSE) console.log("[iAdvize] Security issue: bad signature");
      return res.sendStatus(403).end();
    }

    node.send([{ callback: req.body }, undefined]);
    if (req.body.eventType === "v2.conversation.pushed")
      emitter.emit("messsage_transfer");
    res.sendStatus(200).end();
  });

  let listenerReply = (LISTENERS_REPLY[node.id] = (
    srcNode,
    data,
    srcConfig
  ) => {
    reply(node, data, config);
  });
  helper.listenEvent("reply", listenerReply);
};

const stop = (node, done) => {
  let listenerReply = LISTENERS_REPLY[node.id];
  helper.removeListener("reply", listenerReply);

  done();
};

function isValidSignature(receivedSignature, receivedPayload) {
  if (!receivedSignature || !token) return false;
  let signature = receivedSignature.split("=", 2);
  let algo = signature[0].toUpperCase();
  let hash = cryptoJS["Hmac" + algo](
    JSON.stringify(receivedPayload),
    token
  ).toString();
  let recSignLen = signature[1].length;
  let hashLen = hash.length;

  if (recSignLen != hashLen) return false;
  for (let i = 0; i < hashLen; ++i)
    if (hashLen[i] != recSignLen[i]) return false;
  return true;
}

// ------------------------------------------
//  LRU REQUESTS
// ------------------------------------------

const LRUMap = require("./lru.js").LRUMap;

// Should it be init in start() ?
let _CONTEXTS = new LRUMap(CONFIG.server.contextLRU || 10000);
let _CONTEXT_KEY = "contextId";

const getMessageContext = message => {
  if (message === undefined) return;

  let uuid = helper.getByString(message, _CONTEXT_KEY);
  let context = _CONTEXTS.get(uuid);
  if (!context) {
    context = {};
    let convId = helper.getByString(message, "address.conversation.id");
    uuid = convId + "-" + uuidv4();
    helper.setByString(message, _CONTEXT_KEY, uuid);
    _CONTEXTS.set(uuid, context);
  }
  return context;
};

// ------------------------------------------
//  RECEIVE
// ------------------------------------------

const receive = (node, config, req, res) => {
  // Received
  if (req.body.message.author.role === "operator") {
    let now = new Date().toISOString();
    let msg = {
      idConversation: req.params.conversationId,
      idOperator: req.body.idOperator,
      replies: [],
      variables: [],
      createdAt: now,
      updatedAt: now
    };
    return res.send(msg);
  }

  // Log activity
  try {
    setTimeout(function() {
      helper.trackActivities(node);
    }, 0);
  } catch (err) {
    console.log(err);
  }

  req.body.message.conversationId = req.params.conversationId;
  req.body.message.author.id = req.params.conversationId;

  let data = botmgr.buildMessageFlow(
    { message: req.body.message },
    {
      userId: "message.author.id",
      convId: "message.conversationId",
      payload: "message.payload.value",
      inputType: "message.payload.contentType",
      source: CARRIER
    }
  );

  let context = getMessageContext(data.message);
  context.res = res;
  context.req = req;

  // Handle Prompt
  let convId = botmgr.getConvId(data);
  if (botmgr.hasDelayedCallback(convId, data.message)) return;

  // Trigger received message
  helper.emitEvent("received", node, data, config);
  node.send([undefined, data]);
};

// ------------------------------------------
//  REPLY
// ------------------------------------------

const reply = (node, data, config) => {
  let address = botmgr.getUserAddress(data);
  if (!address || address.carrier !== CARRIER) return false;

  // The address is not used because we reply to HTTP Response
  let context = data.prompt
    ? getMessageContext(data.prompt)
    : getMessageContext(data.message);
  let res = context.res;
  let req = context.req;

  // Building the message
  let now = new Date().toISOString();
  let replies = getMessages(data.reply);

  let msg = {
    idConversation: req.params.conversationId,
    idOperator: req.body.idOperator,
    replies: replies.replies,
    variables: replies.variables,
    createdAt: now,
    updatedAt: now
  };

  if (!replies.transfer) {
    helper.fireAsyncCallback(data);
    res.send(msg);
  } else {
    data.error = 1;
    LISTENERS_TRANSFER[context.channel] = function() {
      delete data.error;
    };
    emitter.addListener(
      "messsage_transfer",
      LISTENERS_TRANSFER[context.channel]
    );
    res.send(msg);

    setTimeout(function() {
      helper.fireAsyncCallback(data);
      emitter.removeListener(
        "messsage_transfer",
        LISTENERS_TRANSFER[context.channel]
      );
    }, 6000);
  }
};

// ------------------------------------------
//  MESSAGES
//  https://developers.iadvize.com/documentation/test/AAA-EPIC-Rich-Content-Documentation#external-bot
// ------------------------------------------

const getMessages = (exports.getMessage = replies => {
  let messages = [];
  let variables = [];
  let transfer = false;
  let prompt = false;
  let event = false;
  let carouselDone = false;

  let trueReplies = [];
  let carousel = [];
  for (let reply of replies) {
    if (
      reply.type === "confirm" ||
      reply.type === "adaptiveCard" ||
      reply.type === "signin"
    ) {
      continue;
    }
    if (reply.type === "card") carousel.push(reply);
    else trueReplies.push(reply);
  }

  let delayMsg = {
    type: "await",
    duration: {
      unit: "millis",
      value: DELAY
    }
  };

  for (let reply of replies) {
    let message = {
      type: "message",
      payload: {}
    };

    if (reply.type === "transfer") {
      messages.pop();
      messages.push(reply);
      messages.push({
        type: "await",
        duration: {
          unit: "seconds",
          value: 3
        }
      });

      transfer = true;
      continue;
    } else if (reply.type === "event") {
      messages.pop();
      variables.push({
        key: reply.event.name,
        value: reply.event.value
      });

      event = true;
      continue;
    } else if (reply.type === "text") {
      message.payload.contentType = "text";
      message.payload.value = reply.text;
    } else if (reply.type === "quick") {
      message.payload.contentType = "text";
      message.payload.value = reply.quicktext;
      message.quickReplies = [];

      for (let button of reply.buttons) {
        message.quickReplies.push({
          contentType: "text/quick-reply",
          value: button.title,
          idQuickReply: uuidv4()
        });
      }
    } else if (reply.type === "media") {
      message.payload = {
        contentType: "file",
        fileName: "Cliquez pour télécharger",
        mimeType: reply.mediaContentType,
        url: reply.media
      };
    } else if (reply.type === "card" && !carouselDone) {
      carouselDone = true;
      let _cards = [];

      for (let _card of carousel) {
        let _obj = {
          contentType: "card/content",
          title: _card.title,
          text: _card.subtitle,
          actions: []
        };
        if (_card.attach) {
          _obj.image = {
            url: _card.attach,
            description: _card.subtext
          };
        }
        for (let button of _card.buttons) {
          _obj.actions.push({
            type: "LINK",
            name: button.title,
            url: button.value
          });
        }
        _cards.push(_obj);
      }
      if (_cards.length > 1) {
        message.payload = {
          contentType: "bundle/card",
          cards: _cards
        };
      } else {
        message.payload = _cards[0];
      }
    } else continue;

    if (reply.prompt) prompt = true;
    messages.push(message);
    messages.push(delayMsg);
  }

  messages.pop();
  if (!prompt && !transfer && !event) messages.push({ type: "close" });
  return { replies: messages, transfer: transfer, variables: variables };
});
