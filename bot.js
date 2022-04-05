// Our config file
const config = require('./config/config.json');

// Discord JS framework
const { Client, Intents, MessageEmbed } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
// Discord JS Modals add-on
const discordModals = require('discord-modals');
discordModals(client);
// Initialized discord-modals

// create-party.js handles all creation requests and interactions
const create_party = require('./src/create-party');
// manage-party.js handles all manage requests for all existing parties
const manage_party = require('./src/manage-party');
// logger.js handles all of our file and console logging purposes via winston
const { logger } = require('./src/logger');

client.once('ready', () => {
    create_party.setupEventListeners(client);
    logger.info(`Create Party event listeners setup complete`);
    manage_party.setupEventListeners(client);
    logger.info(`Manage Party event listeners setup complete`);
    logger.info(`Lost Ark LFG is ready! Create channel: ${config['create-channel-id']}, List channel ${config['list-channel-id']}`)
});

client.login(config.token);