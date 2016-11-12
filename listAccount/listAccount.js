var getData = function(cli, method, result, cb) {
  cli[method].bind(cli); // fix 'this' with bind
  cli[method]({}, function(err, resp) {
    if (err) {
      console.log(err);
      return cb(err);
    }
    resp = JSON.stringify(resp);
    console.log(resp);
    result[method] = resp;
    cb(null);
  });
};


var callMethods = function(yaml, cb) {
  var methodList = yaml;
  var q = d3.queue();
  var result = {};

  Object.keys(methodList['node']).forEach(function(svc) { 
    var cli = new aws[svc]();
    result[svc] = {};
    methodList['node'][svc].forEach(function(method) {
      q.defer(getData, cli, method, result[svc]);  
    });
  });

  q.await(function(err) {
    if (err) {
      console.log(err);
      throw err;
    }
    if (typeof cb === "function") cb(null, result);
    else console.dir(result);    
  });
}


function handler(e, c, cb) {
  yaml = require('yamljs');
  d3 = require('d3');
  aws = require('aws-sdk');

  // var profile = default;
  // var credentials = new aws.SharedIniFileCredentials({profile: profile});
  // aws.config.credentials = credentials;
  aws.config.update({region: 'us-east-1'});
  yaml.load('methodList.yaml', function(yaml) { callMethods(yaml, cb); });

}

var exports = module.exports = {
  handler: handler
};

handler();
