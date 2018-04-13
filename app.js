'use strict';

require('dotenv').config();

const
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    line = require('@line/bot-sdk'),
    lineMiddleware = line.middleware,
    JSONParseError = line.JSONParseError,
    SignatureValidationFailed = line.SignatureValidationFailed;

const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

//line middleware
app.use(lineMiddleware(config));

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json({extended: true}));
app.use(bodyParser.raw({extended: true}));

//app port
app.set('port', process.env.PORT || 3995);

const client = new line.Client(config);

// Line rouring
app.post('/line/webhook', (req, res) => {
    // req.body.events should be an array of events
    if (!Array.isArray(req.body.events)) {
        return res.status(500).end();
    }

    // handle events separately
    Promise.all(req.body.events.map(handleEvent))
        .then(() => res.end())
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

// callback function to handle a single event
function handleEvent(event) {
    switch (event.type) {
        case 'message':
            // create a echoing text message
            const echo = { type: 'text', text: event.message.text };

            // use reply API
            //return client.replyMessage(event.replyToken, echo);

            const message = event.message;
            switch (message.type) {
                case 'text':
                    return client.replyMessage(event.replyToken, echo);
                    return client.pushMessage(event.source.groupId, echo).catch((err)=>{
                        console.log(err)
                    });
                case 'image':
                    return handleImage(message, event.replyToken);
                case 'video':
                    return handleVideo(message, event.replyToken);
                case 'audio':
                    return handleAudio(message, event.replyToken);
                case 'location':
                    return handleLocation(message, event.replyToken);
                case 'sticker':
                    return handleSticker(message, event.replyToken);
                default:
                    throw new Error(`Unknown message: ${JSON.stringify(message)}`);
            }

        case 'follow':
            return replyText(event.replyToken, 'Got followed event');

        case 'unfollow':
            return console.log(`Unfollowed this bot: ${JSON.stringify(event)}`);

        case 'join':
            return replyText(event.replyToken, `Joined ${event.source.type}`);

        case 'leave':
            return console.log(`Left: ${JSON.stringify(event)}`);

        case 'postback':
            let data = event.postback.data;
            if (data === 'DATE' || data === 'TIME' || data === 'DATETIME') {
                data += `(${JSON.stringify(event.postback.params)})`;
            }
            return replyText(event.replyToken, `Got postback: ${data}`);

        case 'beacon':
            return replyText(event.replyToken, `Got beacon: ${event.beacon.hwid}`);

        default:
            throw new Error(`Unknown event: ${JSON.stringify(event)}`);
    }
}

const replyText = (token, texts) => {
    texts = Array.isArray(texts) ? texts : [texts];
    return client.replyMessage(
        token,
        texts.map((text) => ({ type: 'text', text }))
    );
};

//Error handling
app.use((err, req, res, next) => {
    if (err instanceof SignatureValidationFailed) {
        return res.status(401).send(err.signature);
    } else if (err instanceof JSONParseError) {
        return res.status(400).send(err.raw);
    } else
        return res.status(500).send("Internal Server Error.") // will throw default 500
});

/*
const Api = require('./lib/line').ApiController;
const api = new Api({
    'adminDb': adminDb,
    'authHelper': authHelper
});
*/

//app.get('/login', api.login.bind(api));
//app.get('/authorize', api.authorize.bind(api));

//start server
app.listen(app.get('port'), () => {
    console.log('App listening on port ' + app.get('port'));
});