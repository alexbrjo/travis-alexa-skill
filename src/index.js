'use strict';

const Alexa = require('alexa-sdk');
var request = require('sync-request');

const TRAVIS_URL = "https://api.travis-ci.org";
const GITHUB_API_KEY = process.env.GITHUB_API_KEY; // add in lambda
var travisApiKey;

const handlers = {
    'LaunchRequest': function () {
        this.emit('Jobstatus');
    },
    'GetNewFactIntent': function () {
        this.emit('Jobstatus');
    },
    'Jobstatus': function () {
        var jobName = this.event.request.intent.slots.Job;
        var fuzzyJobName = jobName.value.toLowerCase();
        /* 
            Use sync-request because we need a response in sync. 
            Lambda will control time outs (currently 7s)
        */
        var raw = request('GET', TRAVIS_URL + '/repos/alexbrjo/' + fuzzyJobName, {
            'headers': {
                'User-Agent' : 'TravisCIAlexSkill/0.1.0 ',
                'Accept' : 'application/vnd.travis-ci.2+json'//,
                //'Authorization' : 'token ' + travisApiKey
            }
        });
        var data = JSON.parse(raw.getBody('utf8'));
        
        this.emit(':tell', data.healthReport[0].description);
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = this.t('HELP_MESSAGE');
        const reprompt = this.t('HELP_MESSAGE');
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
};

exports.handler = function (event, context) {

    /*var authPost = request('POST', TRAVIS_URL + '/auth/github', {
        'json': { 'github_token' : GITHUB_API_KEY },
        'headers': {
            'User-Agent' : 'TravisCIAlexSkill/0.1.0 ',
            'Accept' : 'application/vnd.travis-ci.2+json'
        }
    });
    console.log(authPost.getBody('utf8'));
    console.log(authPost.headers);
    travisApiKey = JSON.parse(authPost.getBody('utf8')).access_token;
    console.log(JSON.parse(authPost.getBody('utf8')));
    console.log(travisApiKey);*/
    
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = "amzn1.ask.skill.0afa38e5-8ae4-452f-9a01-ed077f3a7920";
    alexa.registerHandlers(handlers);
    alexa.execute();
};

