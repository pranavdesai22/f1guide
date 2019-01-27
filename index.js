'use strict';

//Import dependencies and setup http server
const
    express = require('express'),
    bodyParser = require('body-parser'),
    //create express http server
    app = express().use(bodyParser.json());

//Define the port and log a message on success
app.listen(process.env.PORT || 5000, () => console.log('The five red lights illuminate.'));

//Create webhook endpoint
app.post('/webhook', (req, res) => {
    let body = req.body;

    //Check if the event originates from a page subscription
    if(body.object === 'page'){

        //Iterate over each event as there could be multiple - if batched
        body.entry.forEach(function(pageEntry){

            //Gets the message. pageEntry.messaging is an array, but will only ever contain one message, so we get index 0
            var pageID = pageEntry.id;
            var eventTime = pageEntry.time;

            let webhook_event = pageEntry.messaging[0];
            console.log(webhook_event);
        });

        //Return a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    }
    else{
        //Return a '404 Not Found' error if the event does not originate from a page subscription
        res.status(404);
    }
});

//Support for GET requests for the webhook
app.get('/webhook', (req, res) => {

    //Define Verfication Token for webhook
    let VERIFY_TOKEN = 'myVFtoken2019'

    //Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    //Check if token and mode is in the query string of the request
    if(mode && token){

        //Check if the mode and token are valid
        if(mode === 'subscribe' && token === VERIFY_TOKEN){

            //Responds with the challenge token from the request
            console.log('Webhook Verified');
            res.status(200).send(challenge);
        }
        else{
            //Respond with '403 Forbidden' if the verify token does not match
            res.sendStatus(403);
        }
    }
});