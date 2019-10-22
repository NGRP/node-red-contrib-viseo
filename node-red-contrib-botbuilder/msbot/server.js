"use strict";

let server;
let verbose = CONFIG.server.verbose;

const {
  BotFrameworkAdapter,
  MemoryStorage,
  ConversationState,
  UserState
} = require("botbuilder");

const VBMBot = require("./botVBM");
const VBMDialog = require("./dialogVBM");

async function start(options = {}, node, RED) {
  // Bot
  const dialog = new VBMDialog();
  const memoryStorage = new MemoryStorage();
  let server = RED.httpNode;
  let mscfg = {
    appId: options.appId,
    appPassword: options.appPassword
  };

  // Connector
  let connector = new BotFrameworkAdapter(mscfg);
  server.get("/server-botbuilder", (req, res, next) => {
    res.send("Hello I'm a Bot !");
    return next();
  });

  server.post("/server-botbuilder", (req, res) => {
    connector.processActivity(req, res, async context => {
      console.log("1");
      await bot.run(context);
    });
  });

  connector.onTurnError = async (context, error) => {
    console.error(`\n [onTurnError]: ${error}`);
    await conversationState.delete(context);
  };

  let conversationState = new ConversationState(memoryStorage);
  let userState = new UserState(memoryStorage);

  let bot = new VBMBot(
    conversationState,
    userState,
    dialog,
    node,
    options.startCmd
  );

  return bot;
}

async function stop() {
  if (!server) return;
  server.close();
}

exports.start = start;
exports.stop = stop;
