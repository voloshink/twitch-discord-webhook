const request = require('request');
const config = require('./config.json');

class TwitchWebhook {
	constructor() {
		this.status = {};
		this.recentlyLive = [];
		this.channels = [];
		for (const discord of config.discords) {
			this.channels = this.channels.concat(discord.channels);
		}

		this.setUp();
	}
}

TwitchWebhook.prototype.setUp = function() {
	const channels = this.channels;
	for (const channel of channels) {
		this.getStatus(channel, (ch, status) => {
			this.status[ch] = status;
		});
	}

	this.checkInterval();
};

TwitchWebhook.prototype.getStatus = function(channel, callback) {
	request({
		'url': `https://api.twitch.tv/kraken/streams/${channel}`,
		'headers': {
			'Client-ID': config.clientId
		}
	},
	(err, resp, body) => {
		if (err) {
			console.log(`Error getting status for ${channel}`, err);
			return callback(channel, false);
		}

		let response = false;
		try {
			response = JSON.parse(body);
		} catch (e) {
			console.log('Error parsing message');
			console.log(e);
			console.log(body);
		}

		if (!response) return callback(channel, false);
		return callback(channel, !!response.stream, response.stream);
	});
};

TwitchWebhook.prototype.checkInterval = function() {
	setInterval(this.updateStatuses.bind(this), 60000);
};

TwitchWebhook.prototype.updateStatuses = function() {
	for (const channel of this.channels) {
		this.getStatus(channel, (cnl, status, stream) => {
			if (status && !this.status[cnl] && this.recentlyLive.indexOf(cnl) === -1) this.wentLive(cnl, stream);
			this.status[channel] = status;
		});
	}
};

TwitchWebhook.prototype.wentLive = function(channel, stream) {
	this.recentlyLive.push(channel);

	const payload = {
		embeds: [{
			title: stream.channel.display_name + ' just went live on Twitch!',
			url: 'https://twitch.tv/' + channel,
			color: 6570404,
			thumbnail: {
				url: stream.channel.logo
			},
			image: {
				url: stream.preview.large
			},
			fields: [{
				name: 'Status',
				value: stream.channel.status,
				inline: true
			}]
		}]
	};

	if (stream.game) {
		payload.embeds[0].fields.push({
			name: 'Game',
			value: stream.game,
			inline: true
		});
	}


	let url;
	for (const discord of config.discords) {
		if (discord.channels.indexOf(channel) > -1) url = discord.slackUrl;
	}

	this.slackMessage(payload, url);
	console.log(payload);

	setTimeout(() => {
		this.recentlyLive.splice(this.recentlyLive.indexOf(channel), 1);
	}, 600000);
};

TwitchWebhook.prototype.slackMessage = function(payload, url) {
	request({
		url: url,
		method: 'POST',
		body: JSON.stringify(payload),
		headers: {
			'Content-type': 'application/json'
		}
	}, (err, response) => {
		if (err) console.log(err);
		console.log(config.slackUrl);
		console.log(payload);
		console.log(response.statusCode);
	});
};


new TwitchWebhook();
