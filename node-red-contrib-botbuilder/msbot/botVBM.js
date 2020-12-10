const { ActivityHandler } = require("botbuilder");

class VBMBot extends ActivityHandler {
  constructor(node, welcomeMessage, sendWelcomeMessage) {
    super();
      
    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (let cnt = 0; cnt < membersAdded.length; cnt++) {
        if (membersAdded[cnt].id === context.activity.recipient.id) {
          return await new Promise(function(resolve, reject) {
            context.activity.type = "message";
            context.activity.value = welcomeMessage;
            sendWelcomeMessage(node, context, resolve, reject, next);
          });
        }
      }
      await next();
    });
  }
}

module.exports.VBMBot = VBMBot;
