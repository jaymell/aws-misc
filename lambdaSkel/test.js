config = require('./properties.js');
lambdaSkel = require('./lambdaSkel.js');

var test = function() {
  lambdaSkel.handler({'testing': '123'}, {'context': 'u'}, function(err, data) {
  	if (err) throw err;
  	console.log(JSON.stringify(data));
  });
}();
