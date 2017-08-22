'use strict';

const Alexa = require('alexa-sdk');
var request = require('sync-request');
var FuzzySet = require('fuzzyset.js');

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
        /* 
            Use sync-request because we need a response in sync. 
            Lambda will control time outs (currently 7s)
        */
        var raw = request('GET', TRAVIS_URL + '/repos/alexbrjo.json', {
            'headers': {
                'User-Agent' : 'TravisCIAlexSkill/0.1.0 ',
                'Accept' : 'application/vnd.travis-ci.2+json'
            }
        });
        var repos = JSON.parse(raw.getBody('utf8'));
        var fuzzy = {
            names: [],
            repos: {}
        };
        for (var i = 0; i < repos.length; i++) {
            var repo = repos[i];
            if (repo.active) {
                var name = repo.slug.split('/')[1];
                fuzzy.names.push(name);
                fuzzy.repos[name] = repo;
            }
        }
        
        // Use FuzzySet.js to match a repo
        var matchedRepo;
        var fs = FuzzySet(fuzzy.names);
        var evaled = fs.get(this.event.request.intent.slots.Job.value);
        if (evaled.length > 0) {
            matchedRepo = fuzzy.repos[evaled[0][1]];
        } else {
            this.emit(':tell', 'No repo was found for that name');
        }
        
        switch(matchedRepo.last_build_status) {
            case 0:
                this.emit(':tell', 'The last build was successful');
                break;
            case 1:
                this.emit(':tell', 'The last build was unsuccessful');
                break;
            default: 
                case 1:
                this.emit(':tell', 'This repository has not been built');
                break;
        }
        
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
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = "amzn1.ask.skill.0afa38e5-8ae4-452f-9a01-ed077f3a7920";
    alexa.registerHandlers(handlers);
    alexa.execute();
};

