S3 = require('aws-sdk/clients/s3');
KMS = require('aws-sdk/clients/kms');
config = require('./properties.js');

var getEnv = function(c) {
  /* sample context object 
  {
    "callbackWaitsForEmptyEventLoop": true,
    "logGroupName": "/aws/lambda/qa-swift-qa-swift-InitDBa",
    "logStreamName": "2016/11/12/[$LATEST]c42949838bf44938a9eea37fe2ccb5ec",
    "functionName": "qa-swift-qa-swift-InitDBa",
    "memoryLimitInMB": "512",
    "functionVersion": "$LATEST",
    "invokeid": "3d927ad3-a8b7-11e6-9398-753911c5e7c6",
    "awsRequestId": "3d927ad3-a8b7-11e6-9398-753911c5e7c6",
    "invokedFunctionArn": "arn:aws:lambda:us-east-1:219359266667:function:qa-swift-qa-swift-InitDBa"
  }
  */
  var regex = /(.*)-.*$/;
  return regex.exec(c.functionName)[1];
};

var handler = function(e, c, cb) {
  var env = getEnv(c);
  if (!(env in config.buckets) cb(Error("bucket not found"));
  var bucket = config.buckets[env];
  var s3 = new AWS.S3();
  // s3.copyObject({
  // 	Bucket: 
  // })
  cb(null, [e, c]);
}

module.exports = {
  handler: handler
}; 
