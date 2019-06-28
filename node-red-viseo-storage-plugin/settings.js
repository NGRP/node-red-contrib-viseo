/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var when = require('when');
var fs = require('fs-extra');
var fspath = require("path");

var log = require("node-red/red/runtime/log");
var util = require("./util");

var globalSettingsFile;
var globalSettingsBackup;
var projectSettingsFile;
var projectSettingsBackup;
var settings;

module.exports = {
    init: function(_settings) {
        settings = _settings;
        globalSettingsFile = fspath.join(settings.settingsDir,".config.json");
        globalSettingsBackup = fspath.join(settings.settingsDir,".config.json.backup");

        projectSettingsFile = fspath.join(settings.userDir,".config.json");
        projectSettingsBackup = fspath.join(settings.userDir,".config.json.backup");
    },
    getSettings: function() {

        return when.promise(async function(resolve,reject) {

            let settings = {};

            try {
                let data = await fs.readFile(globalSettingsFile,'utf8')
                settings = util.parseJSON(data);
            } catch(err) {
                log.trace("Corrupted global config detected - resetting");
            }

            let nodesSettings = {};

            try {
                data = await fs.readFile(projectSettingsFile, 'utf8');
                nodesSettings = util.parseJSON(data);
            } catch(err) {
                log.trace("Corrupted project config detected - resetting");
            }
                
            Object.assign(settings, nodesSettings);

            return resolve(settings);
        
        })
    },
    saveSettings: function(newSettings) {
        if (settings.readOnly) {
            return when.resolve();
        }
        let projectSettings = JSON.stringify({"nodes": newSettings["nodes"]},null,1);
        let globalSettings = newSettings;
        delete globalSettings["nodes"];


        return util.writeFile(projectSettingsFile, projectSettings, projectSettingsBackup)
            .then(util.writeFile(globalSettingsFile, JSON.stringify(globalSettings,null,1), globalSettingsBackup));
    }
}
