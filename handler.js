'use strict';


var manager = require('./lib/manager.js');

module.exports.generate = (event, context, cb) => {

  const dynamoRecords = manager.parseDynamoEvents(event);
  if (dynamoRecords) {
    console.log(`Got ${event.Records.length} dynamo events`);
    console.log(`Parsed ${dynamoRecords.length} records`);

    const insertRecords = manager.newRecordEvents(dynamoRecords);
    console.log(`Filtered and got ${insertRecords.length} filtered records`);

    //console.log(JSON.stringify(insertRecords));
    console.log(`Calling generator with ${JSON.stringify(insertRecords[0])}`);
    let lsystem = manager.lambdaCreateLSystem(insertRecords[0]).then((msg) =>{
      console.log(`Response ${JSON.stringify(msg)}`);
      return msg;
      //cb(null,`Response from lambda: ${msg}`);
    });

    let s3UploadMsg = lsystem.then( manager.msgToS3(insertRecords[0].id) ); 
    let rendered = lsystem.then( manager.lambdaRenderLSystem(insertRecords[0]) );

    Promise.all( [lsystem, s3UploadMsg, rendered] ).then( (params) => cb(null, `Done: ${params[0]}`) );

  } else {

    cb(null, {
      message: 'Go Serverless v1.0! Your function executed successfully!',
      event
    });

  }

};

// You can add more handlers here, and reference them in serverless.yml
