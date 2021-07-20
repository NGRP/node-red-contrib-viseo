const { JwtTokenValidation, SkillValidation } = require('botframework-connector');

class AllowedCallersClaimsValidator {
    constructor(skillsConfig) {
        if (typeof skillsConfig === undefined) {
            throw new Error('[Botbuilder] AllowedCallersClaimsValidator: skillsConfig is undefined');
        }

        this.allowedCallers = [...Object.values(skillsConfig)].map(skill => skill.appId).filter(skill => typeof skill !== 'undefined');
    }

    async validateClaims(claims) {
        // For security, developer must specify allowedCallers.
        if (!this.allowedCallers || this.allowedCallers.length === 0) {
            throw new Error('AllowedCallers not specified');
        }

        // If allowedCallers contains '*', we allow all calls.
        if (!this.allowedCallers.includes('*') && SkillValidation.isSkillClaim(claims)) {
            // Check that the appId claim in the skill request is in the list of skills configured for this bot.
            const appId = JwtTokenValidation.getAppIdFromClaims(claims);
            if (!this.allowedCallers.includes(appId)) {
                throw new Error(`Received a request from a bot with an app ID of "${ appId }". To enable requests from this caller, add the app ID to your configuration file.`);
            }
        }
    }
}

module.exports.AllowedCallersClaimsValidator = AllowedCallersClaimsValidator;