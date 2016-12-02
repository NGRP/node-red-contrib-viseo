"use strict";

String.prototype.endsWith = function(suffix) {
  if (!suffix) return false;
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.startsWith = function(prefix) {
  if (!prefix) return false;
  return this.indexOf(prefix) === 0;
};