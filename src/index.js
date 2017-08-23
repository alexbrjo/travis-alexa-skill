/**
 * This Travis CI Alexa skill is decision tree based. There are 2 types of information
 * that is useful: the user or organisation and the repository. Information from Travis
 * should be done in a one API call per Alexa intent to be efficient, fast and respectful
 * to the public API.
 *
 * Github username may only contain alphanumeric characters or hyphens.
 * Github username cannot have multiple consecutive hyphens.
 * Github username cannot begin or end with a hyphen.
 * Maximum is 39 characters.
 *
 * @author Alex Johnson
 */

'use strict';

const Alexa = require('alexa-sdk');

// Intent handler implementations
var Setuser = require('./Setuser.js');
var Repostatus = require('./Repostatus.js');
var Moreinfo = require('./Moreinfo.js');

var welcome = 'Welcome to Travis CI. Ask about a repository';

exports.handler = function (event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = "amzn1.ask.skill.0afa38e5-8ae4-452f-9a01-ed077f3a7920";
    alexa.dynamoDBTableName = process.env.DYNAMO_DB_TABLE;
    alexa.registerHandlers(handler);
    alexa.execute();
};

// Root intent handler, longer intents impls are in other files
var handler = {
    'LaunchRequest': function () {
        var attrUser = this.attributes['user'];
        if (typeof attrUser === 'undefined') {
            this.emit(':ask', 'Welcome to Travis CI. Please tell me your user or organization name. ' +
                    'Usernames are hard for me so you might need to spell it out.');
        } else {
            this.emit(':tell', 'Welcome to Travis CI. Ask about a repository');
        }
    },
    'Setuser': Setuser.impl,
    'Repostatus': Repostatus.impl,
    'Moreinfo': Moreinfo.impl,
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
