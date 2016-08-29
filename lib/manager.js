'use strict';
const AWS = require('aws-sdk');
const region = 'eu-west-1';
AWS.config.update({region: region || 'eu-west-1'});
const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

const error = (context) => (err) => {
  const contextString = JSON.stringify(context);
  console.log(`Error::${contextString}\nmsg:err`);
};

const parseS3EventRecord = ( record ) => {

  const bucket = record.s3.bucket.name;
  const key = record.s3.object.key;

  return {Bucket: bucket, Key: key};

};

const downloadS3Individual = ( s3Individual ) => {
  return (
    s3.getObject( s3Individual ).promise()
          .catch( error({
            info: 'error downloading file',
            individual: s3Individual
          }))
  );
};

const parseS3DownloadResponse = ( response ) => {
  const fileContents = response.Body.toString();
  const [ angle, g_commands ] = fileContents.split(':');
  return { angle: angle, g_commands: g_commands };
};

const lambdaRenderLSystem = (individual) =>  {
  console.log(`Calling painter with ${individual}.`);
  const params = {
    FunctionName: 'bigben-lsystems-painter-dev-s3render',
    Payload: JSON.stringify(individual)
  };
  return lambda.invoke(params).promise()
                .catch( error({
                    info: 'error invoking lambda',
                    individual: individual
                }));
};

module.exports = {
  lambdaRenderLSystem : lambdaRenderLSystem,
  parseS3EventRecord : parseS3EventRecord,
  downloadS3Individual : downloadS3Individual,
  parseS3DownloadResponse : parseS3DownloadResponse
};
