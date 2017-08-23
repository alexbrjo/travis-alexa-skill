module.exports = {
    impl: function () {
        var fuzzyUser = this.event.request.intent.slots.User;
        this.attributes['user'] = fuzzyUser.value;
        this.emit(':saveState', true);
        this.emit(':ask', 'is ' + this.attributes['user'] + ' correct?');
    }
};
