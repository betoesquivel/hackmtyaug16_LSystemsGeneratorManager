'use strict';


var manager = require('./lib/manager.js');

module.exports.generate = (event, context, cb) => {

  let individualRenders = [];
  const s3Records = event.Records;
  console.log(`Received ${s3Records.length} rendering jobs.`);

  for ( s3EventRecord of s3Records ) {

    let parsedRecord = manager.parseS3EventRecord( s3EventRecord );
    let s3DownloadResponse = manager.downloadS3Individual( parsedRecord );
    let individual = s3DownloadResponse.then( manager.parseS3DownloadResponse );
    let rendered = manager.lambdaRenderLSystem( individual );

    Promise.all( [individual, rendered] ).then( (params) => console.log(`Done: ${JSON.stringify(params)}`) ) 

    individualRenders.push( Promise.all( [individual, rendered] ) );

  } 

  Promise.all( individualRenders )
          .then( (individuals) => {
            cb(null, `Finished ${individuals.length} renders`);
          })
          .catch( (err) => {
            cb(`Couldn't finish because of:\n${JSON.stringify(err)}`);
          });

};

// You can add more handlers here, and reference them in serverless.yml
