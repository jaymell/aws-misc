
var _getEnv = function(c) {
  var regex = /^([A-Za-z]+)-.*$/;
  // console.log('regex found env: ', regex.exec(c.functionName));
  return regex.exec(c.functionName)[1];
};


var _getApp = function(c) {
  var regex = /^[A-Za-z]+-([A-Za-z]+).*$/;
  // console.log('regex found app: ', regex.exec(c.functionName));
  return regex.exec(c.functionName)[1];
};


var regexMatch = function(pattern, string) {
  var regex = pattern;
  // error handling!
  return regex.exec(string);
};


var getContextVars = function(c) {
  var regex = /^arn:aws:lambda:(.*):([0-9]+):function:(.*)$/;
  var parsed = regex.exec(c.invokedFunctionArn);
  // console.log('parsed: ', parsed);
  return {
    region: parsed[1],
    account: parsed[2],
    functionName: parsed[3],
    env: _getEnv(c),
    app: _getApp(c)
  };
};

var getStackInfo = function(stackList, cb) {
  var cf = new AWS.CloudFormation();
  cf = Promise.promisifyAll(cf);
  q = new BlueBirdQueue();
  for(var i=0; i<stackList.length; i++) {
    var params = {
      StackName: stackList[i].StackName
    };
    q.add(cf.describeStacksAsync.bind(cf)(params));
  }
  q.start().then(function(data) {
    return cb(null, data);
  });
};


var getStackList = function(event, cb) {
  var cf = new AWS.CloudFormation();
  cf = Promise.promisifyAll(cf);
  var stackList = [];
  var recurseList = function(stackList, params) {
    if (!params) {
      params = {};
    }
    params["StackStatusFilter"] = properties.statuses;
    cf.listStacksAsync(params)
      .then(function(data) {
        var regex = new RegExp('^(' + contextVars.env + '-' + contextVars.app + ')');
        data.StackSummaries
          .filter( function(d) { return regex.exec(d.StackName); })
            .forEach(function(d) { stackList.push(d); });

        if (data.NextToken) {
          recurseList(stackList, {NextToken: data.NextToken});
        }
        else {
          return getStackInfo(stackList, cb);
        }
      });
  };
  recurseList(stackList);
};


var filterStacks = function(stackList, cb) {
};


var handler = function(event, context, cb) {
  AWS = require('aws-sdk');
  Promise = require("bluebird");
  BlueBirdQueue = require('bluebird-queue');

  properties = require('./properties.js');
  contextVars = getContextVars(context);
  AWS.config.update({maxRetries: 100});
  AWS.config.update({region: contextVars.region});

  if ('profile' in event) {
    console.log('Using profile: ', event.profile);
    var credentials = new AWS.SharedIniFileCredentials({profile: event.profile});
    AWS.config.credentials = credentials;
  }

  getStackList(event, cb);
};

module.exports = {
  handler: handler
}; 

