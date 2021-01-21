const { SkillConversationIdFactoryBase, TurnContext } = require('botbuilder');

/**
 * A SkillConversationIdFactory that uses an in memory dictionary
 * to store and retrieve ConversationReference instances.
 */
class SkillConversationIdFactory extends SkillConversationIdFactoryBase {
    constructor() {
        super();
        this.refs = {};
    }

    async createSkillConversationIdWithOptions(options) {
        const skillConversationReference = {
            conversationReference: TurnContext.getConversationReference(options.activity),
            oAuthScope: options.fromBotOAuthScope
        };
        const key = skillConversationReference.conversationReference.conversation.id;
        this.refs[key] = skillConversationReference;
        return key;
    }

    async getSkillConversationReference(skillConversationId) {
        return this.refs[skillConversationId];
    }

    async deleteConversationReference(skillConversationId) {
        this.refs[skillConversationId] = undefined;
    }
}

module.exports.SkillConversationIdFactory = SkillConversationIdFactory;