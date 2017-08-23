/**
 * This Travis CI Alexa skill is decision tree based. There are 2 types of information 
 * that is useful: the user or organisation and the repository. Information from Travis
 * should be done in a one API call per Alexa intent to be efficient, fast and respectful 
 * to the public API.
 *
 * @author Alex Johnson
 */

'use strict';

const Alexa = require('alexa-sdk');
var request = require('sync-request');
var FuzzySet = require('fuzzyset.js');
/*var AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1'
});

var params = {
    TableName: 'travisAlexaSkillUserData',
    Key: { "nameId":  event.session.user.userId }
};

var db = new AWS.DynamoDB.DocumentClient();
db.get(params, (err, data) => {
    if (err) {
        console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        callback(data.Item.repo);
    }
});*/
////////////////////////////////////////////////////////

const TRAVIS_URL = "https://api.travis-ci.org";
const GITHUB_API_KEY = process.env.GITHUB_API_KEY; // add in lambda

var welcome = 'Welcome to Travis CI. Ask about a repository';

exports.handler = function (event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = "amzn1.ask.skill.0afa38e5-8ae4-452f-9a01-ed077f3a7920";
    alexa.dynamoDBTableName = process.env.DYNAMO_DB_TABLE;
    alexa.registerHandlers(handler);
    alexa.execute();
};

var extractName = function (s) { return s.slug.split('/')[1]; }

var handler = {
    'LaunchRequest': function () {
        this.emit(':tell', 'Welcome to Travis CI. Ask about a repository');
    },
    'Repostatus': function () {
        this.emit(':saveState', true);
        
        /* Determine if there is user and/or repo data from the session */
        var attrUser = this.attributes['user'];
        if (typeof this.event.request.intent.slots.User !== 'undefined' &&
                typeof this.event.request.intent.slots.User.value !== 'undefined') {
            attrUser = this.event.request.intent.slots.User.value;
            this.attributes['user'] = attrUser;
        }
        var attrRepo = this.attributes['repo'];
        if (typeof this.event.request.intent.slots.Repo !== 'undefined' &&
                typeof this.event.request.intent.slots.Repo.value !== 'undefined') {
            attrRepo = this.event.request.intent.slots.Repo.value;
            this.attributes['repo'] = attrRepo;
        }
        
        if (typeof attrUser === 'undefined') {
            this.emit(':tell', 'Please specify the user or organization');
            return;
        }
        
        if (typeof attrRepo === 'undefined') {
            this.emit(':tell', 'Please specify the repository');
            return;
        }
        
        /*  
            Now we have an organization name and a fuzzy repo name. We can find a Travis
            build for these
        
            Use sync-request because we need a response in sync. Lambda will control time 
            outs (currently 7s, you can set it to whatever)
        */
        var raw = request('GET', TRAVIS_URL + '/repos/' + attrUser + '.json', {
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
                var name = extractName(repo);
                fuzzy.names.push(name);
                fuzzy.repos[name] = repo;
            }
        }
        
        // Use FuzzySet.js to match a repo
        var matchedRepo;
        var fs = FuzzySet(fuzzy.names);
        var evaled = fs.get(attrRepo);
        if (evaled.length > 0) {
            matchedRepo = fuzzy.repos[evaled[0][1]];
        } else {
            this.emit(':tell', 'No repo was found for that name');
        }
        
        /*
          Repo status has been found, now respond
        */
        this.attributes['repo'] =  extractName(matchedRepo);
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
        this.emit(':ask', "You can ask for the build status of a Travis build by any GitHub user or organization", 
            "You can ask for the build status of a Travis build by any GitHub user or organization");
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', 'goodbye');
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', 'goodbye');
    },
    'Unhandled': function () {
        this.emit(':ask', 'Ask away', 'Ask away');
    }
};

