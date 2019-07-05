
var fs = require('fs-extra');
var fspath = require("path");
var spawn = require('child_process').spawn;

var rp = require("request-promise");
var semversort = require("semver-sort");
var gitTools = require("./projects/git");

var settings;
var runtime;
var log;

var viseo = {
	init: function(_settings, _runtime) {

		settings = _settings;
		runtime = _runtime;
		log = _runtime.log

        runtime.adminApi.adminApp.get('/viseo-bot-framework/versions', async function(req, res) {

            let versions = await viseo.getFrameworkVersions();
            res.send({updates: versions});
        });

        runtime.adminApi.adminApp.post("/viseo-bot-framework/update", function(req, res) {
        	let version = req.body.version;

            viseo.updateFrameworkVersion(version)
            	.then(() => {
					runtime.events.emit("runtime-event",{
		                id:"viseo-success",
		                payload:{
		                    type:"success",
		                    error:"framework updated",
		                    text:"VISEO Bot Maker has been successfully updated to version "+version,
		                },
		                retain:true
		            });

	                setTimeout(() => {
	                    process.exit();//kill to restart and reload everything
	                }, 1000)
            	})
            	.catch((err) => {
            		if(err === "local-changes") {
            			runtime.events.emit("runtime-event",{
			                id:"viseo-error",
			                payload:{
			                    type:"error",
			                    error:"viseo-local-changes",
			                    text:"Your VISEO BOT Maker already has local changes. <br/>You need to undo them before you can upgrade.",
			                    timeout:8200
			                },
			                retain:false
			            });


                		log.warn("Local changes found. Packages update aborted");
			            res.sendStatus(200);
            		} else if(err === "version-unknown") {

            			runtime.events.emit("runtime-event",{
			                id:"viseo-error",
			                payload:{
			                    type:"error",
			                    error:"viseo-version-unknown",
			                    text:"Version "+version+" could not be found in VISEO BOT Maker repository. <br/>Upgrade was cancelled.",
			                    timeout:8200
			                },
			                retain:false
			            });


                		log.warn("VISEO Bot Maker version unknown. Packages update aborted");
			            res.sendStatus(200);
            		} else {
            			log.error(err);
            			runtime.events.emit("runtime-event",{
			                id:"viseo-error",
			                payload:{
			                    type:"error",
			                    error:"viseo-error-unknown",
			                    text:"An error occured during update. Please read the logs for further details.",
			                    timeout:8200
			                },
			                retain:false
			            });

            			res.sendStatus(500);
            		}
            	});
        })
	},

	getFrameworkVersions: async function() {
		try {
			let versions = []
			let data = await rp({
				url: "https://api.github.com/repos/NGRP/node-red-viseo-bot/releases",
				headers: {
					"User-Agent": "VISEO-Innovation"
				}
			});
			let releases = JSON.parse(data);

			for(let release of releases) {
				if(/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(release.tag_name)) {
					versions.push(release.tag_name);
				}
			}

			semversort.asc(versions);

			// filter only upgrades: 
			let packagejsonPath = fspath.join(process.env.FRAMEWORK_ROOT, 'package.json');

			try {
                fs.statSync(packagejsonPath);

				let packagejson = require(packagejsonPath);
				let search = 'v'+packagejson.version;

				while(versions.length > 0 && versions[0] !== search) {
					versions.shift();
				}
				if(versions.length > 0 && versions[0] === search) {
					versions.shift();
				}

				return versions;

            } catch(err) {

                log.error("VISEO Bot Maker package.json cannot be found at : "+packagejsonPath);
            }

		} catch(e) {
			log.error(e);
		}

		return [];
	},

	updateFrameworkVersion: function(version) {

		return new Promise(async function(resolve, reject) {
			//change framework tag
			try {
				var gitpath = process.env.FRAMEWORK_ROOT;

				await gitTools.init(settings, runtime)
				let status = await gitTools.getStatus(gitpath);
				let files = status.files;
				let remote = status.branches.remote;
				let local = status.branches.local;

				for(let file of Object.keys(files)) {
					if(files[file].status === ' M') {
						return reject("local-changes");
					}
				}

				log.debug("Get latest version from server");
				await gitTools.fetch(gitpath, "origin");

				log.debug("Git checkout version "+version);
				await gitTools.checkoutBranch(gitpath, version);

				log.debug("VISEO Bot Maker checkedout to version "+version);

				log.debug("Updating npm packages...");

				var output = await execUpdateProcess();
				log.debug(output);

				resolve();

			} catch(err) {

				if(/did not match any file\(s\) known to git/i.test(err.stderr)) {
					return reject("version-unknown");
				}

				reject(err);
			}

		});
	}
}

const execUpdateProcess = () => {

	return new Promise((resolve, reject) => {

		var child = spawn("node", ["update_projects.js"], {cwd:process.env.FRAMEWORK_ROOT, detached:true, env:process.env});
		var stdout = "";
		var stderr = "";

		child.stdout.on('data', function(data) {
		    stdout += data;
		});
		child.stderr.on('data', function(data) {
		    stderr += data;
		});
		child.on('error', function(err) {
		    stderr = err.toString();
		})
		child.on('close', function(code) {

		    if (code !== 0) {
		        var err = new Error(stderr);
		        err.stdout = stdout;
		        err.stderr = stderr;
		        
		        return reject(err);
		    }

		    resolve(stdout);
		})
	});
}



module.exports = {
	init: viseo.init
};