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

const parseDynamoAttributes = (dynamoAttributes) => {
  var parsedAttributes = {};
  Object.keys(dynamoAttributes).map( (attribute) => {
    const type = Object.keys(dynamoAttributes[attribute])[0];
    if (type === 'L') {
      parsedAttributes[attribute] = dynamoAttributes[attribute].L.map( (o) => o.S );
    } else {
      parsedAttributes[attribute] = Object.keys(dynamoAttributes[attribute]).map( (k) => dynamoAttributes[attribute][k] )[0];
    }
  } );
  //console.log(`Parsed ${JSON.stringify(parsedAttributes)}!`);
  return parsedAttributes;
};

const parseDynamoEvent = (dynamoEvent) => {

  //console.log(`Parsing dynamo event's new attributes: ${JSON.stringify(dynamoEvent)}`);
  const parsedAttributes = parseDynamoAttributes(dynamoEvent.dynamodb.NewImage);

  const parsed = Object.assign({}, {
    'eventName': dynamoEvent.eventName,
    'id': parsedAttributes.id,
    'attributes': parsedAttributes
  });

  return parsed;

};

const parseDynamoEvents = (dynamoEvents) => {
  const dynamoRecords = dynamoEvents.Records;
  if ( dynamoRecords ) {
    return dynamoRecords.map( parseDynamoEvent );
  } else {
    return null;
  }
};

const newRecordEvents = (parsedEvents) => {
  const insertEvents = parsedEvents.filter( (e) => e.eventName === "INSERT" );
  return insertEvents;
};

const lambdaCreateLSystem = (event) => {
  const params = {
    FunctionName: 'bigben-lsystems-parser-dev-parse',
    Payload: JSON.stringify(event.attributes)
  };
  return lambda.invoke(params).promise()
                .catch( error({
                    info: 'error invoking lambda',
                    event: event
                }));
};

const parseS3EventRecord = ( record ) => {

  const bucket = record.s3.bucket.name;
  const key = record.s3.object.key;

  return {Bucket: bucket, Key: key};

};

const downloadS3Individual = ( s3Individual ) => {
  return s3.getObject( s3Individual ).promise()
                .catch( error({
                    info: 'error downloading file',
                    individual: s3Individual
                }));
};

const parseS3DownloadResponse = ( response ) => {
  const fileContents = response.Body.toString();
  const [ angle, g_commands ] = fileContenst.split(':');
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

const msgToS3 = (id) => (msgResponse) => {
  let msg = msgResponse.Payload;
  console.log(`Uploading to s3 ${id}.json: ${msg}`);
  var params = {Bucket: 'hackmtyaug16-bigben-lsystems', Key: id+".json", Body: JSON.stringify({ g_commands: msg })};
  return s3.putObject(params).promise().catch( function(err) {
    console.log(err);
  });
};


module.exports.parseDynamoEvents = parseDynamoEvents;
module.exports.newRecordEvents = newRecordEvents;
module.exports.lambdaCreateLSystem = lambdaCreateLSystem;
module.exports.lambdaRenderLSystem = lambdaRenderLSystem;
module.exports.msgToS3 = msgToS3;
module.exports.parseS3EventRecord = parseS3EventRecord;
module.exports.downloadS3Individual = downloadS3Individual;
module.exports.parseS3DownloadResponse = parseS3DownloadResponse;
