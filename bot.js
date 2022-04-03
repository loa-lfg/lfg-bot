const { Client, Intents, MessageEmbed } = require('discord.js');
const config = require('./config.json');
const discordModals = require('discord-modals')

// create-party.js handles all creation requests and interactions
const create_party = require('./create-party')

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
// Initialized discord-modals
discordModals(client);

client.once('ready', () => {
    // Initialize channels
    console.log(`Lost Ark LFG is ready! Create channel: ${config['create-channel-id']}, List channel ${config['list-channel-id']}`);
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