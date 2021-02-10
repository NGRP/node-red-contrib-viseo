class SkillsConfiguration {
    constructor(skills, hostEndpoint) {

        if (!hostEndpoint) {
            throw new Error('[SkillsConfiguration]: Missing configuration parameter. hostEndpoint is required');
        }

        this._skills = skills;
        this._hostEndpoint = hostEndpoint;
    }

    get skills() {
        return this._skills;
    }

    set skills(skills) {
        this._skills = skills;
    }

    get hostEndpoint() {
        return this._hostEndpoint;
    }

    set hostEndpoint(hostEndpoint) {
        this._hostEndpoint = hostEndpoint;
    }
}

module.exports.SkillsConfiguration = SkillsConfiguration;