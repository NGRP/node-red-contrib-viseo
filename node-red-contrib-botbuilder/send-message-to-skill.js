const helper   = require('node-red-viseo-helper');

const handleError = (node, msg, error) => {
    msg.error = { message: error.message, source: 'send-message-to-skill' };
    console.error(error);
    node.error('Unable to send message to bot. See msg._error for more info', msg);
};

module.exports = function exportSendMessageToBot(RED) {
    function sendMessageToBot(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.on('input', (data) => {
            // Set active skill
            const skillId = helper.getContextValue(RED, node, data, config.skillId, config.skillIdType || 'str');
            const botbuilder = require('./msbot-connect.js').botbuilder;
            const skill = botbuilder.skillsConfig.skills[skillId];
            // Send the activity to the skill
            botbuilder.sendToSkill(data, skill)
                .then(() => {
                    node.send([data, undefined]);
                })
                .catch((error) => {
                    handleError(node, data, error);
                    node.send([undefined, data]);
                });
        });
    }
    RED.nodes.registerType('send-message-to-skill', sendMessageToBot);
};
