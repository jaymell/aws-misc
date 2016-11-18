
var _getEnv = function(c) {
  var regex = /^([A-Za-z]+)-.*$/;
  console.log('regex found env: ', regex.exec(c.functionName));
  return regex.exec(c.functionName)[1];
};

var _getApp = function(c) {
  var regex = /^[A-Za-z]+-([A-Za-z]+).*$/;
  console.log('regex found app: ', regex.exec(c.functionName));
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
  console.log('parsed: ', parsed);
  return {
    region: parsed[1],
    account: parsed[2],
    functionName: parsed[3],
    env: _getEnv(c),
    app: _getApp(c)
  };
};

var getStackInfo = function(stackList, cb) {
  var q = d3.queue();
  for(var i=0; i<stackList.length; i++) {
    var params = {
      StackName: stackList[i].StackName
    };
    q.defer(cf.describeStacks.bind(cf), params);
  }
  q.awaitAll(function(err, data) {
    if (err) throw err;
    cb(null, data);
  });
};

var getStackList = function(e, cb) {
  
  var stackList = [];
  var q = d3.queue();
  var levels = 0;

  var recurseList = function(stackList, params) {
    levels++;
    if (!params) {
      console.log('no params');
      params = {};
    }
    params["StackStatusFilter"] = properties.statuses;
    // console.log('params: ', params);
    cf.listStacks(params, function(err, data) {
      if (err) {
        console.log(err, err.stack);
        throw err;
      }
      // console.log('stackList: ', stackList);
      // console.log('data: ', data);

      var regex = new RegExp('^(' + contextVars.env + '-' + contextVars.app + ')');
      data.StackSummaries.forEach(function(d) {
        if (regex.exec(d.StackName)) {
          stackList.push(d);
        }
      });
      console.log('token: ', data.NextToken);
      if (data.NextToken) {
        recurseList(stackList, {NextToken: data.NextToken});
      }
      else {
        console.log('leaving after ' + levels + ' recursions');
        return getStackInfo(stackList, cb);
      }
    });
  };
  recurseList(stackList);
}; 

var filterStacks = function(stackList, cb) {
};

var handler = function(e, c, cb) {
  Yaml = require('yamljs');
  AWS = require('aws-sdk');
  d3 = require('d3');

  properties = require('./properties.js');
  contextVars = getContextVars(c);
  AWS.config.update({maxRetries: 100});
  AWS.config.update({region: contextVars.region});
  if ('profile' in e) {
    console.log('Using profile: ', e.profile);
    var credentials = new AWS.SharedIniFileCredentials({profile: e.profile});
    AWS.config.credentials = credentials;
  }
  // bad global!
  cf = new AWS.CloudFormation();
  getStackList(e, cb);
};

module.exports = {
  handler: handler
}; 

