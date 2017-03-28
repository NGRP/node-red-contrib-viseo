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

/**
 * This module validates the JSON response and attaches extra helper properties to it
 *
 * @param JsonResponse a string that represents the JSON response of LUIS
 */
module.exports = function (JsonResponse) {
  if (typeof JsonResponse === "undefined" || JsonResponse === null || JsonResponse.length === 0) {
    throw new Error("Invalid Application Id");
  }
  
  var   LUISresponse = undefined;
  try { LUISresponse = JSON.parse(JsonResponse); } catch(ex){
    throw new Error(JsonResponse);
  }

  if (LUISresponse.hasOwnProperty("statusCode")) {
    throw new Error("Invalid Subscription Key");
  }
  if (LUISresponse.hasOwnProperty("dialog") && typeof LUISresponse.dialog !== "undefined") {
    LUISresponse.dialog.isFinished = function () {
      return this.status === "Finished";
    };
  }
  return LUISresponse;
};