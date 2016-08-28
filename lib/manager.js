'use strict';
const AWS = require('aws-sdk');
const region = 'eu-west-1';
AWS.config.update({region: region || 'eu-west-1'});
const lambda = new AWS.Lambda();

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

const lambdaRenderLSystem = (event) => (msgResponse) =>  {
  console.log(`Calling painter with ${msgResponse.Payload} and ${JSON.stringify(event)}`);
  const payload = Object.assign({}, event, { g_commands: msgResponse.Payload });
  const params = {
    FunctionName: 'bigben-lsystems-painter-dev-s3render',
    Payload: JSON.stringify(payload)
  };
  return lambda.invoke(params).promise()
                .catch( error({
                    info: 'error invoking lambda',
                    payload: payload
                }));
};


module.exports.parseDynamoEvents = parseDynamoEvents;
module.exports.newRecordEvents = newRecordEvents;
module.exports.lambdaCreateLSystem = lambdaCreateLSystem;
module.exports.lambdaRenderLSystem = lambdaRenderLSystem;
