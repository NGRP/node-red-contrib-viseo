Fork of the Node-RED local file storage system.
The following changes have been made :
- Information on storage of files are in [bot]/data/package.json file see template [https://github.com/NGRP/viseo-bot-template/blob/migration-nodered-0.18/data/package.json]
- Removal of the ability to open a project : A node process can only run one project.  New projects are created and initialized but not loaded.
- Git commits are pushed automatically if remote branch has been set


Compatibility : Node-RED 0.19
