const {
  AttachmentLayoutTypes,
  MessageFactory,
  CardFactory,
  CardAction
} = require("botbuilder");
const helper = require("node-red-viseo-helper");
const botmgr = require("node-red-viseo-bot-manager");
const getMessage = require("./messages.js");

// --------------------------------------------------------------------------
//  BUILDMESSAGE
// --------------------------------------------------------------------------

function buildMessageFlow(context) {
  // Fix
  let message = context.activity;
  if (!message.serviceUrl) return;

  message.user = message.from;
  message.address = { conversation: message.conversation };

  // Build data
  let data = botmgr.buildMessageFlow(
    {
      message: JSON.parse(JSON.stringify(message)),
      payload: message.text,
      user: message.from
    },
    { agent: "botbuilder" }
  );

  return data;
}

// --------------------------------------------------------------------------
//  RECEIVED
// --------------------------------------------------------------------------

async function receive(node, config = {}, context, next, resolve, reject) {
  // Log activity
  try {
    setTimeout(function() {
      helper.trackActivities(node);
    }, 0);
  } catch (err) {
    console.log(err);
  }

  let data = buildMessageFlow(context);

  // Add context object to store the lifetime of the stream
  let convId = botmgr.getConvId(data);

  let _context = botmgr.getContext(data);
  _context.botContext = context;
  _context.resolve = resolve;
  _context.reject = reject;
  _context.next = next;

  // Handle Prompt
  if (botmgr.hasDelayedCallback(convId, data.message)) {
    return;
  }

  // Send message
  _context.lastMessageDate = data.message.timestamp;
  helper.emitEvent("received", node, data, config);
  node.send([null, data]);
}

module.exports.receive = receive;

// --------------------------------------------------------------------------
//  HANDLENEWUSER
// --------------------------------------------------------------------------

function handleNewUser(node, context, resolve, reject, next) {
  let data = buildMessageFlow(context);
  data.message = {};
  let _context = botmgr.getContext(data);
  _context.botContext = context;
  _context.resolve = resolve;
  _context.reject = reject;
  _context.next = next;

  node.send([data, null]);
}

module.exports.handleNewUser = handleNewUser;

// --------------------------------------------------------------------------
//  REPLY
// --------------------------------------------------------------------------

async function reply(node, data, globalTypingDelay) {
  //check it's the last message
  let context = botmgr.getContext(data);

  let timestamp = data.message.timestamp;
  if (timestamp) timestamp = new Date(timestamp).valueOf();

  let timeContext = context.lastMessageDate;
  if (timeContext) timeContext = new Date(timeContext).valueOf();
  if (timestamp && timestamp !== timeContext) return false;

  // Assume we send the message to the current user address
  let address = botmgr.getUserAddress(data);
  if (!address || address.carrier !== "botbuilder") return false;

  let resolve = context.resolve;
  let next = context.next;

  // Building the message
  let message;

  if (data.customReply) {
    message = data.customReply;
    message.address = address;
    message.data = {
      type: message.type
    };
  } else if (data.reply.length === 0) {
    return { resolve, next };
  } else {
    message = getMessage(
      node,
      address,
      data.reply,
      globalTypingDelay,
      timestamp == undefined
    );
    if (!message) return false;
    message.address = address;
    if (data.metadata) message.data.value = data.metadata;
  }

  await context.botContext.sendActivities(message);
  return { resolve, next };
}

module.exports.reply = reply;
