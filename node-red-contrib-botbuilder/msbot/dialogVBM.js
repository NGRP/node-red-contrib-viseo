const {
  ComponentDialog,
  DialogSet,
  DialogTurnStatus
} = require("botbuilder-dialogs");

class VBMDialog extends ComponentDialog {
  constructor() {
    super("VBMDialog");
    this.logger = console;
    this.initialDialogId = "VBMDialog";
  }

  /**
   * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
   * If no dialog is active, it will start the default dialog.
   * @param {*} turnContext
   * @param {*} accessor
   */
  async run(turnContext, accessor) {
    /*
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();

        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
        */
  }
}

module.exports = VBMDialog;
