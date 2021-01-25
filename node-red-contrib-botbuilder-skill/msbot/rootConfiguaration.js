class RootConfiguration {
    constructor() {
        this.rootData = {};

        // Note: we only have one skill in this sample but we could load more if needed.
        const botFrameworkSkill = {
            id: 'master',
            appId: '56cdbb27-87a7-4fe9-973a-099ba2835a42'
        };

        this.rootData[botFrameworkSkill.id] = botFrameworkSkill;
    }

    get root() {
        return this.rootData;
    }
}

module.exports.RootConfiguration = RootConfiguration;