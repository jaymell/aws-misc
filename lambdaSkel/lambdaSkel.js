S3 = require('aws-sdk/clients/s3');
KMS = require('aws-sdk/clients/kms');
config = require('./properties.js');

var getEnv = function(c) {
  var regex = /^([A-Za-z]+)-.*$/;
  console.log('regex found: ', regex.exec(c.functionName)[1]);
  return regex.exec(c.functionName)[1];
};

var testDecrypt = function(err, data) {
  if (err) throw err;
  var kms = new KMS();
  console.log('data: ', data);
  kms.decrypt({'CiphertextBlob': data.Body}, function(err, decrypted) {
    if(err) console.log('decrypt error: ', err);
    console.log(decrypted.Plaintext.toString());
  });
};

var handler = function(e, c, cb) {
  var env = getEnv(c);
  console.log('env: ', env);
  if (!(env in config.buckets)) cb(Error("bucket not found"));
  var bucket = config.buckets[env];
  var s3 = new S3();
  s3.getObject({
    Bucket: config.buckets[env],
    Key: "lambda/" + c.functionName + "/" + config.credentials,
  }, testDecrypt);
  cb(null, [e, c]);
}

module.exports = {
  handler: handler
}; 

