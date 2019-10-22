const { ActivityHandler } = require("botbuilder");
const { handleNewUser } = require("./actions.js");

class VBMBot extends ActivityHandler {
  /**
   *
   * @param {ConversationState} conversationState
   * @param {UserState} userState
   * @param {Dialog} dialog
   */
  constructor(conversationState, userState, dialog, node, welcomeMessage) {
    super();
    if (!conversationState)
      throw new Error(
        "[DialogBot]: Missing parameter. conversationState is required"
      );
    if (!userState)
      throw new Error("[DialogBot]: Missing parameter. userState is required");
    if (!dialog)
      throw new Error("[DialogBot]: Missing parameter. dialog is required");

    this.conversationState = conversationState;
    this.userState = userState;
    this.dialog = dialog;
    this.logger = console;
    this.dialogState = this.conversationState.createProperty("DialogState");

    this.onMessage(async (context, next) => {
      this.logger.log("Running dialog with Message Activity.");

      // Run the Dialog with the new message Activity.
      await this.dialog.run(context, this.dialogState);

      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });

    this.onDialog(async (context, next) => {
      // Save any state changes. The load happened during the execution of the Dialog.
      await this.conversationState.saveChanges(context, false);
      await this.userState.saveChanges(context, false);

      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });

    // If a welcome message is defined, handle the new user event
    if (welcomeMessage) {
      console.log(welcomeMessage);
      this.onMembersAdded(async (context, next) => {
        const membersAdded = context.activity.membersAdded;
        for (let cnt = 0; cnt < membersAdded.length; cnt++) {
          if (membersAdded[cnt].id === context.activity.recipient.id) {
            // Sends the message to the user
            return await new Promise(function(resolve, reject) {
              handleNewUser(node, context, resolve, reject, next);
            });
          }
        }
        await next();
      });
    }
  }
}

module.exports = VBMBot;
