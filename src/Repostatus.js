var request = require('sync-request');
var FuzzySet = require('fuzzyset.js');

const TRAVIS_URL = "https://api.travis-ci.org";
const GITHUB_API_KEY = process.env.GITHUB_API_KEY; // add in lambda

module.exports = {
    impl: function () {
        var extractName = function (s) { return s.slug.split('/')[1]; }
        this.emit(':saveState', true);

        /* Determine if there is user and/or repo data from the session */
        var attrRepo = this.attributes['repo'];
        if (typeof this.event.request.intent.slots.Repo !== 'undefined' &&
                typeof this.event.request.intent.slots.Repo.value !== 'undefined') {
            attrRepo = this.event.request.intent.slots.Repo.value;
            this.attributes['repo'] = attrRepo;
        }

        var attrUser = this.attributes['user'];
        if (typeof attrUser === 'undefined') {
            this.emit(':ask', 'Please spell out the user or organization');
            return;
        }

        if (typeof attrRepo === 'undefined') {
            this.emit(':ask', 'Please specify the repository');
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
    }
};
