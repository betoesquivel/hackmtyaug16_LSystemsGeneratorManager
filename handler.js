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
  const data = fileContents.split(':');
  const angle = data[0];
  const  g_commands = data[1];
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

module.exports.generate = (event, context, cb) => {

  console.log(`Received ${JSON.stringify(event)}.`);

  let individualRenders = [];
  const s3Records = event.Records;
  if ( s3Records ) {
    const numberOfRecords = s3Records.length;
    console.log(`Received ${numberOfRecords} rendering jobs.`);

    for (let i = 0; i < numberOfRecords; i++) {
        let s3EventRecord = s3Records[i];
        let parsedRecord = parseS3EventRecord( s3EventRecord );
        let s3DownloadResponse = downloadS3Individual( parsedRecord );
        let individual = s3DownloadResponse.then( parseS3DownloadResponse );
        let rendered = individual.then( lambdaRenderLSystem );

        Promise.all( [individual, rendered] ).then( (params) => console.log(`Done: ${JSON.stringify(params)}`) );

        individualRenders.push( Promise.all( [individual, rendered] ) );
    } 

    if(cb) {
      Promise.all( individualRenders )
              .then( (individuals) => {
                cb(null, `Finished ${individuals.length} renders`);
              })
              .catch( (err) => {
                cb(`Couldn't finish because of:\n${JSON.stringify(err)}`);
              });
    }

  } else {
    cb(`Couldn't finish because of:\n${JSON.stringify(err)}`);
  }



};

// You can add more handlers here, and reference them in serverless.yml
