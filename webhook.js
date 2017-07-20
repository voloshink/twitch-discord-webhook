const request = require('request');
const config = require('./config.json');

const statusDict = {};
const recentlylive = [];
let channels = [];

function getStatus(channel, callback) {
	const options = {
		'url': `https://api.twitch.tv/kraken/streams/${channel}`,
		'headers': {
			'Client-ID': config.clientId
		}
	};

	request(options, (err, resp, body) => {
		if (err) {
			console.log(`Error getting status for ${channel}`, err);
			callback(false);
			return;
		}

		try {
			const response = JSON.parse(body);
			callback(response.stream);
		} catch (e) {
			console.log('Error parsing message');
			console.log(e);
			callback(false);
		}
	});
}

function discordMessage(payload, url) {
	const options = {
		url: url,
		method: 'POST',
		body: JSON.stringify(payload),
		headers: {
			'Content-type': 'application/json'
		}
	};

	request(options, err => {
		if (err) console.log(err);
	});
}


function wentLive(channelName, stream) {
	recentlylive.push(channelName);

	const {channel, preview} = stream;

	const payload = {
		embeds: [{
			title: `${channel.display_name} just went live on Twitch!`,
			url: `https://twitch.tv/${channel.name}`,
			color: 6570404,
			thumbnail: {
				url: channel.logo
			},
			image: {
				url: preview.large
			},
			fields: [{
				name: 'Status',
				value: channel.status,
				inline: true
			}]
		}]
	};

	if (channel.game) {
		payload.embeds[0].fields.push({
			name: 'Game',
			value: channels.game,
			inline: true
		});
	}


	for (const discord of config.discords) {
		if (discord.channels.indexOf(channel) > -1) {
			const url = discord.webhookUrl;
			discordMessage(payload, url);
		}
	}

	setTimeout(() => {
		recentlyLive.splice(recentlyLive.indexOf(channelName), 1);
	}, 600000);
}


function updateStatuses() {
	for (const channel of this.channels) {
		getStatus(channel, stream => {
			if (stream && !statusDict[channel] && recentlyLive.indexOf(channel) === -1) wentLive(channel, stream);
			statusDict[channel] = status;
		});
	}
}

function startCheckInterval() {
	setInterval(() => {
		updateStatuses();
	}, 60000);
}

function setUp() {
	for (const channel of channels) {
		getStatus(channel, status => {
			statusDict[channel] = status;
		});
	}

	startCheckInterval();
}

for (const discord of config.discords) {
	channels = channels.concat(discord.channels);
}

setUp();
