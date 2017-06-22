# Node-RED

A Node-RED node to perform an OAuth2 Authentication with [Microsoft Graph](https://developer.microsoft.com/en-us/graph).

## Quick Start

To use the Microsoft Graph Connect Sample for Node.js, you need either a [Microsoft account](https://www.outlook.com/) or a [work or school account](http://dev.office.com/devprogram)

```
npm install node-red-contrib-viseo-ms-graph
```


### Register the Application

1. Sign into the [App Registration Portal](https://apps.dev.microsoft.com/) using either your personal or work or school account.
2. Choose Add an app.
3. Enter a name for the app, and choose Create application. The registration page displays, listing the properties of your app.
4. Copy the Application Id. This is the unique identifier for your app.
5. Under Application Secrets, choose Generate New Password. Copy the password from the New password generated dialog. You'll use the application ID and password (secret) to configure the sample app in the next section.
6. Under Platforms, choose Add Platform.
7. Choose Web. (You already should have Native Platform, otherwise add it too)
8. Enter https://server.url:1880/callback-auth as the Redirect URI.
9. Choose Save.


### Build the Node-RED Flow

This [sample](https://github.com/NGRP/node-red-contrib-viseo/raw/master/node-red-contrib-ms-graph/doc/flow.json) demonstrate an authentication throught a ChatBot.

![Flow](https://github.com/NGRP/node-red-contrib-viseo/raw/master/node-red-contrib-ms-graph/doc/flow.jpg)

#### Sign-In

The first row build an URL to `https://login.microsoftonline.com/common` with credentials then send a ChatBot Sign-In Card

#### Callback URL

The second row 
- handle HTTP GET Request to `/callback-auth` and answer a "Thank You" message.
- the callback `code` is resolved into a `refreshToken` and `accessToken`. 
- the callback `state` is resolved to fetch the ChatBot user, save the credential and send back a message.

#### API Testing

The third row try to retrieve the microsoft profile with an HTTP request to `https://graph.microsoft.com/v1.0/me`


## Getting Help

For further help, or general discussion, please use the [github issue tracker](https://github.com/NGRP/node-red-contrib-viseo/issues) and in order to be labeled with `question` tag please specify :
- Your message is a question / discussion
- The module or node name

## Contributing

Before raising a pull-request, please read our contributing guide.

This project adheres to the Contributor Covenant 1.4. By participating, 
you are expected to uphold this code. 
Please report unacceptable behavior to any of the project's core team.

## Authors

This project is a creation of [Jean-Philippe Encausse](http://www.encausse.net) for the [SARAH](http://sarah.encausse.net) home automation project.

- Jean-Philippe Encausse [@jpencausse](https://twitter.com/jpencausse)


## Copyright and license

Copyright 2012-2017 [SARAH](http://sarah.encausse.net) under the Apache 2.0 license.
Copyright 2016-2017 [VISEO](http://www.viseo.com) under the Apache 2.0 license.