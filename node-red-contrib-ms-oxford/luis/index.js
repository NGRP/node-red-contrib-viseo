/*
 Copyright (c) Microsoft. All rights reserved.
 Licensed under the MIT license.

 Microsoft Cognitive Services (formerly Project Oxford): https://www.microsoft.com/cognitive-services


 Microsoft Cognitive Services (formerly Project Oxford) GitHub:
 https://github.com/Microsoft/ProjectOxford-ClientSDK


 Copyright (c) Microsoft Corporation
 All rights reserved.

 MIT License:
 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED ""AS IS"", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

"use strict";

var https = require("https");
var util = require("util");
var LUISResponse = require("./luis_response");

/**
 * This is the interface of the LUIS SDK
 * Constructs a LUISClient with the corresponding user's App ID and Subscription Keys
 * Starts the prediction procedure for the user's text, and accepts a callback function
 *
 * @param initData an object that has 3 propertes:
 * @1- appId a String containing the Application Id
 * @2- appKey a String containing the Subscription Key
 * @3- verbose a Boolean to choose whether to use the verbose version or not
 * @returns {{predict: predict, reply: reply}} an object containing the functions that need to be used
 */
var LUISClient = function(initData) {
  validateInitData(initData);
  var appId = initData.appId;
  var appKey = initData.appKey;
  var verbose = initData.verbose;
  validateAppInfoParam(appId, "Application Id");
  validateAppInfoParam(appKey, "Subscription Key");
  verbose = validateBooleanParam(verbose, "Verbose");
  const LUISURL = initData.host;
  const LUISPredictMask = "/luis/v2.0/apps/%s?subscription-key=%s&q=%s&verbose=%s";
  const LUISReplyMask = "/luis/v2.0/apps/%s?subscription-key=%s&q=%s&contextid=%s&verbose=%s";
  const LUISVerbose = verbose ? "true" : "false";

  return {
    /**
     * Initiates the prediction procedure
     *
     * @param text a String containing the text which needs to be analysed and predicted
     * @param responseHandlers an object that contains "onSuccess" and "onFailure" functions to be executed
     * on the success or failure of the web request
     */
    predict: function (text, responseHandlers) {
      text = validateText(text);
      validateResponseHandlers(responseHandlers);
      var LUISOptions = {
        hostname: LUISURL,
        path: util.format(LUISPredictMask, appId, appKey, encodeURIComponent(text), LUISVerbose)
      };
      httpHelper(LUISOptions, responseHandlers);
    },
    /**
     * Initiates the prediction procedure
     *
     * @param text a String containing the text which needs to be analysed and predicted
     * @param LUISresponse an object that contains the context ID of the dialog
     * @param responseHandlers an object that contains "onSuccess" and "onFailure" functions to be executed
     * on the success or failure of the web request
     */
    reply: function (text, LUISresponse, responseHandlers, forceSetParameterName) {
      text = validateText(text);
      validateLUISresponse(LUISresponse);
      validateResponseHandlers(responseHandlers);
      var LUISOptions = {
        hostname: LUISURL,
        path: util.format(LUISReplyMask, appId, appKey, encodeURIComponent(text),
          LUISresponse.dialog.contextId, LUISVerbose)
      };
      if (forceSetParameterName !== null && typeof forceSetParameterName === "string") {
        LUISOptions.path += util.format("&forceset=%s", forceSetParameterName);
      }
      httpHelper(LUISOptions, responseHandlers);
    }
  };
};


/**
 * Initiates the web request
 *
 * @param LUISOptions a String containing the text which needs to be analysed and predicted
 * @param responseHandlers an object that contains "onSuccess" and "onFailure" functions to be executed
 * on the success or failure of the web request
 */
var httpHelper = function (LUISOptions, responseHandlers) {
  var req = https.request(LUISOptions, function (response) {
    var JsonResponse = "";
    response.on("data", function (chunk) {
      JsonResponse += chunk;
    });
    response.on("end", function () {
      var LUISresponse = undefined
      try {LUISresponse = LUISResponse(JsonResponse); }
      catch (err) { return responseHandlers.onFailure(err); }
      responseHandlers.onSuccess(LUISresponse);
    });
  });
  req.end();
  req.on("error", function (err) {
    responseHandlers.onFailure(err);
  });
};

/**
 * Validates initialization object of LUISClient
 *
 * @param initData an object that has 4 propertes:
 * @1- appId a String containing the Application Id
 * @2- appKey a String containing the Subscription Key
 * @3- verbose a Boolean to choose whether to use the verbose version or not
 */
var validateInitData = function (initData) {
  if (initData === null || typeof initData === "undefined") {
    throw new Error("Null or undefined initialization data for LUISClient");
  }
  if (!initData.hasOwnProperty("appId")) {
    throw new Error("You have to provide an Application Id in the initialization data object");
  }
  if (!initData.hasOwnProperty("appKey")) {
    throw new Error("You have to provide an Subscription Key in the initialization data object");
  }
};

/**
 * Validates the App info parameters such as Application Id and SubscriptionKey
 *
 * @param appInfoParam a String that represents an App info parameter
 * @param appInfoParamName a String containing the parameter's name
 */
var validateAppInfoParam = function (appInfoParam, appInfoParamName) {
  validateStringParam(appInfoParam, appInfoParamName);
  if (appInfoParam === "") {
    throw new Error("Empty " + appInfoParamName);
  }
  if (appInfoParam.indexOf(" ") !== -1) {
    throw new Error("Invalid " + appInfoParamName);
  }
};

/**
 * Validates the text to predict
 *
 * @param text a String containing the text which needs to be analysed and predicted
 * @returns a string containing the processed text to use for prediction
 */
var validateText = function (text) {
  validateStringParam(text,"Text to predict");
  text = text.trim();
  if (text === "") {
    throw new Error("Empty text to predict");
  }
  return text;
};

/**
 * Validates a string parameter
 *
 * @param param a string that represents a parameter to a function
 * @param paramName the parameter's name
 */
var validateStringParam = function (param, paramName) {
  if (typeof param === "undefined" || param === null) {
    throw new Error("Null or undefined " + paramName);
  }
  if (typeof param !== "string") {
    throw new Error(paramName + " is not a string");
  }
};

/**
 * Validates a boolean parameter
 *
 * @param param a boolean that represents a parameter to a function
 * @param paramName a String that represents the parameter's name
 */
var validateBooleanParam = function (param, paramName) {
  if (typeof param === "undefined" || param === null) {
    param = true;
  }
  if (typeof param !== "boolean") {
    throw new Error(paramName + " flag is not boolean");
  }
  return param;
};

/**
 * Validates the response handlers
 *
 * @param responseHandlers an object that contains "onSuccess" and "onFailure" functions to be executed
 * on the success or failure of the web request
 */
var validateResponseHandlers = function (responseHandlers) {
  if (typeof responseHandlers === "undefined" || responseHandlers === null) {
    throw new Error("You have to provide a response handlers object " +
      "containing 'onSuccess' and 'onFailure' functions")
  }
  if (!responseHandlers.hasOwnProperty("onSuccess") || typeof responseHandlers.onSuccess === "undefined"
    || responseHandlers.onSuccess === null || typeof responseHandlers.onSuccess !== "function") {
    throw new Error("You have to provide an 'onSuccess' function as a property " +
      "of the response handlers object")
  }
  if (!responseHandlers.hasOwnProperty("onFailure") || typeof responseHandlers.onFailure === "undefined"
    || responseHandlers.onFailure === null || typeof responseHandlers.onFailure !== "function") {
    throw new Error("You have to provide an 'onFailure' function as a property " +
      "of the response handlers object")
  }
};

/**
 * Validates the LUISresponse
 *
 * @param LUISresponse an object that contains the context ID of the dialog
 */
var validateLUISresponse = function (LUISresponse) {
  if (typeof LUISresponse === "undefined" || LUISresponse === null || !LUISresponse.hasOwnProperty("dialog")
    || typeof LUISresponse.dialog === "undefined" || !LUISresponse.dialog.hasOwnProperty("contextId")
    || typeof LUISresponse.dialog.contextId === "undefined" || typeof LUISresponse.dialog.contextId !== "string") {
    throw new Error("You have to provide a LUISResponse object containing the Context Id of the dialog" +
      " you're replying to");
  }
};

module.exports = LUISClient;
