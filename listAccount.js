function handler(e, c, cb) {

  yaml = require('yamljs');
  var d3 = require('d3');
  aws = require('aws-sdk');
  // var profile = default;
  / /var credentials = new aws.SharedIniFileCredentials({profile: profile});
  //aws.config.credentials = credentials;
  aws.config.update({region: 'us-east-1'});

  var methodList;
  var q = d3.queue();

  yaml.load('methodList.yaml', function(result) {
    methodList = result;
    Object.keys(methodList['node'])
      .forEach(function(i) { 
        var cli = new aws[i]();
        methodList['node'][i].forEach(function(j) {
          console.log(j);
          // bind required here -- see this:
          q.defer(cli[j].bind(cli), {}); 
          // cli[j]({}, function(e, d) { 
          //   console.log(d); 
          // }); 
        });
      });
  });

  setTimeout(function() {
    q.awaitAll(function(err, data) {
      if (err) {
        console.log(err);
        throw err;
      }
      console.log(data);    
    })
  }, 10000);
}

handler();
