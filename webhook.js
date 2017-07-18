var request = require('request');
var config = require('./config.json');

var TwitchWebhook = function() {
    this.status = {};
    this.recentlyLive = [];
    this.channels = [];
    for (var i = 0; i < config.discords.length; i++) {
	this.channels = this.channels.concat(config.discords[i].channels);
    }

    this.setUp();
}

TwitchWebhook.prototype.setUp = function() {
    var channels = this.channels;
    for (var i = 0; i < channels.length; i++) {
        this.getStatus(channels[i], function(channel, status) {
            this.status[channel] = status;
        }.bind(this));
    }

    this.checkInterval();
}

TwitchWebhook.prototype.getStatus = function(channel, callback) {
    request({'url': 'https://api.twitch.tv/kraken/streams/' + channel,
             'headers': { 'Client-ID': config.clientId}},
            function(err, resp, body) {
        if (err) {
            console.log('Error getting status for ' + channel, err);
            return callback(channel, false);
        }
        var response = false;
        try {
            response = JSON.parse(body);
        } catch(e) {
            console.log('Error parsing message');
            console.log(e)
            console.log(body)
        }
        if (!response) return callback(channel, false);
        return callback(channel, !!response.stream, response.stream);
    });
}

TwitchWebhook.prototype.checkInterval = function() {
    setInterval(this.updateStatuses.bind(this), 60000);
}

TwitchWebhook.prototype.updateStatuses = function() {
    var channels = this.channels;
    for (var i = 0; i < channels.length; i++) {
        this.getStatus(channels[i], function(channel, status, stream) {
            if (status && !this.status[channel] && this.recentlyLive.indexOf(channel) === -1) this.wentLive(channel, stream);
            this.status[channel] = status;
        }.bind(this));
    }
}

TwitchWebhook.prototype.wentLive = function(channel, stream) {
    this.recentlyLive.push(channel);

   var payload = {
	embeds: [
	{
	    title: stream.channel.display_name + ' just went live on Twitch!',
	    url: 'https://twitch.tv/' + channel,
	    color: 6570404,
	    thumbnail: {
	        url: stream.channel.logo
	    },
	    image: {
	        url: stream.preview.large
	    },
	    fields: [
		{
		    name: 'Status',
		    value: stream.channel.status,
		    inline: true
		}]
	}]};
	
    if (stream.game) payload.embeds[0].fields.push({
	name: 'Game',
	value: stream.game,
	inline: true
	});	
		

    var url;
    for (var i = 0; i < config.discords.length; i++) {
	if (config.discords[i].channels.indexOf(channel) > -1) url = config.discords[i].slackUrl;
    }

    this.slackMessage(payload, url);
    console.log(payload);

    setTimeout(function() {
        this.recentlyLive.splice(this.recentlyLive.indexOf(channel), 1);
    }.bind(this), 600000);
}

TwitchWebhook.prototype.slackMessage = function(payload, url) {
    request({
        url: url,
        method: 'POST',
        body: JSON.stringify(payload),
	headers: {
		'Content-type': 'application/json'
	}
    }, function(err, response, body) {
        if (err) console.log(err);
	console.log(config.slackUrl);
	console.log(payload);
	console.log(response.statusCode);
    });
}


var webhook = new TwitchWebhook();
