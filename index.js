'use strict';

//Environment settings
process.env.NODE_ENV = 'dev';
process.env.NODE_APP_INSTANCE = '';

//Import dependencies and setup http server
const
    config = require('config'),
    express = require('express'),
    bodyParser = require('body-parser'),
    crypto = require('crypto'),
    https = require('https');

//Set server port and send message on success
var app = express();
app.set('port', process.env.PORT || 5000, () => console.log('The five red lights illuminte.'));
app.set('view engine', 'ejs');
app.use(bodyParser.json({
    verify: verifyRequestSignature
}));
app.use(express.static('public'));

// Arbitrary value used to validate a webhook
const
    VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
    (process.env.MESSENGER_VALIDATION_TOKEN) :
    config.get('validation_token');

// App Secret can be retrieved from the App Dashboard
const
    APP_SECRET = (process.env.MESSENGER_APP_SECRET) ?
    process.env.MESSENGER_APP_SECRET :
    config.get('app_secret');

// Generate a page access token for your page from the App Dashboard
const
    PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
    (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
    config.get('page_access_token');

//Setup Server Base Path
const
    SERVER_URL = (process.env.SERVER_URL) ?
    (process.env.SERVER_URL) :
    config.get('server_url');

//Check if all the basic requirements are in place
if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
    console.error("Error in config values");
    process.exit(1);
}

//Verify that the callback came from Facebook: https://developers.facebook.com/docs/graph-api/webhooks#setup

function verifyRequestSignature(req, res, buf) {
    var signature = req.headers["x-hub-signature"];

    if (!signature) {
        // For testing, let's log an error. In production, you should throw an
        // error.
        console.error("Couldn't validate the signature.");
    } else {
        var elements = signature.split('=');
        var method = elements[0];
        var signatureHash = elements[1];

        var expectedHash = crypto.createHmac('sha1', APP_SECRET)
            .update(buf)
            .digest('hex');

        if (signatureHash != expectedHash) {
            throw new Error("Couldn't validate the request signature.");
        }
    }
}

//Start server. Webhooks must be available via SSL with a certificate signed by a valid certificate authority.
app.listen(app.get('port'), function () {
    console.log('Node app is running on port', app.get('port'));
});

module.exports = app;

//Base Path
app.get("/", function (req, res) {
    res.send("Deployed!");
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VALIDATION_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {
    var body = req.body;
    //console.log(body);
    //Check if this is a page subscription
    if (body.object === 'page') {

        //Iterate over each entry since there could be multiple if batched
        body.entry.forEach(function (pageEntry) {
            var pageID = pageEntry.id;
            var eventTime = pageEntry.time;

            //Iterate over each messaging event
            if (pageEntry.messaging) {
                pageEntry.messaging.forEach(function (allMessages) {
                    if (allMessages.message) {
                        eventTextMessage(allMessages);
                    } else if (allMessages.postback) {
                        eventPostbackMessage(allMessages);
                    }
                    //console.log(allMessages);
                });
            }
        });

        //Assuming everything went well
        res.sendStatus(200);
    } else {
        // Return a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
});

//Setup Get Started Button
buttonGetStarted();

function buttonGetStarted() {
    var messageData = {
        "get_started": {
            "payload": "GET_STARTED"
        }
    };

    // Start the request
    request({
            url: 'https://graph.facebook.com/v2.12/me/messenger_profile?access_token=' + PAGE_ACCESS_TOKEN,
            //qs: { access_token: PAGE_ACCESS_TOKEN },
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            form: messageData
        },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log("Success! Get Started button setup is complete.");
                //Call the Persistent Menu
                setPersistentMenu();
            } else {
                // TODO: Handle errors
                console.log("Error setting Get Started button: " + error);
                console.log("This is the Error: " + body);
            }
        });
}