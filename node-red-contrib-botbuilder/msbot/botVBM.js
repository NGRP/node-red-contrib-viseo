const { ActivityHandler } = require('botbuilder');

class VBMBot extends ActivityHandler {
  constructor(node, appId, welcomeMessage, sendWelcomeMessage, conversationState, skillsConfig, skillClient) {
    super();

    if (!node) {
      throw new Error('[BotBuilder] Property node missing in the VBMBOT');
    }

    if (!appId) {
      throw new Error('[BotBuilder] Property appId missing in the VBMBOT');
    }

    this.botId = appId;
    if (conversationState) {
      this.conversationState = conversationState;
    }
    if (skillsConfig) {
      this.skillsConfig = skillsConfig;
    }
    if (skillClient) {
      this.skillClient = skillClient;
    }

    // Sends welcome messages to conversation members when they join the conversation.
    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;

      for (let member of membersAdded) {
        // Greet anyone that was not the target (recipient) of this message.
        // Since the bot is the recipient for events from the channel,
        // context.activity.membersAdded === context.activity.recipient.Id indicates the
        // bot was added to the conversation, and the opposite indicates this is a user.
        if (member.id !== context.activity.recipient.id) {
            context.activity.type = 'message';
            context.activity.text = welcomeMessage;
            sendWelcomeMessage(node, context);
        }
      }
      await next();
    });

    this.onEvent(async (context, next) => {
      if (context.activity.name === 'webchat/feedback') {
        context.activity.type = 'message';
        context.activity.text = 'feedback';
        sendWelcomeMessage(node, context);
      }
      await next();
    });
  }
  // Override the ActivityHandler.run() method to save state changes
  async run(context) {
    await super.run(context);
    if (this.conversationState) await this.conversationState.saveChanges(context, false);
  }

  // Route the activity to the skill
  async sendToSkill(activity, targetSkill) {
    if (typeof activity === 'undefined') {
      throw new Error(`[Botbuilder]: cannot find activity to send to skill`);
    }
    if (typeof targetSkill === 'undefined') {
      throw new Error(`[Botbuilder]: cannot find skill to send activity`);
    }
    const response = await this.skillClient.postToSkill(this.botId, targetSkill, this.skillsConfig.hostEndpoint, activity);

    if (!(response.status >= 200 && response.status <= 499)) {
      throw new Error(`[Botbuilder]: cannot invoke skill with appId: "${targetSkill.appId}" \r\nat "${targetSkill.skillEndpoint}" \r\n(status is ${response.status}). \r\n ${response.body}`);
    }
  }

}

module.exports.VBMBot = VBMBot;
