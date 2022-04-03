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
    logger.info(`Lost Ark LFG is ready! Create channel: ${config['create-channel-id']}, List channel ${config['list-channel-id']}`)
});

// Message processing
client.on('messageCreate', (message) => {
    // Check if message created by bot
    if (message.author.bot) return;

    // Check if it is in the right channel
    if (message.channelId == config['create-channel-id'] && message.content == '!setup') {
        create_party.handleSetup(client, message);
    };
});

// Interaction button processing
client.on('interactionCreate', async interaction => {
    // We ignore everything that isn't a button press
	if (!interaction.isButton()) return;

    if (interaction.customId == 'create-party'){
        create_party.handleCreateParty(interaction);
    } else if (interaction.customId == 'confirm-party') {
        create_party.handleConfirmParty(client, interaction);
    } else if (interaction.customId == 'customize-party'){
        create_party.handleCustomizeParty(client, interaction);
    } 
});

// Interaction dropdown menu processing
client.on('interactionCreate', interaction => {
	if (!interaction.isSelectMenu()) return;

    if (interaction.customId == 'gamemode-select'){
        create_party.handleGamemodeSelect(interaction);
    } else if (interaction.customId == 'activity-select'){
        create_party.handleActivitySelect(interaction);
    }
});

// Modal submission processing
client.on('modalSubmit', async (modal) => {
    if(modal.customId == 'create-party-modal'){
        create_party.handleModalSubmit(client, modal);
    }
});

client.login(config.token);