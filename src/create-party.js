// at the top of your file
const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');
const { Modal, TextInputComponent, showModal } = require('discord-modals');

const gamemodes = require('../config/gamemodes.json');
const config = require('../config/config.json');

// create party boilerplate for embed message
function createEmbed(){
    party_types = '';
    for (const [key, value] of Object.entries(gamemodes)) {
        party_types += value.display + "\n";
    }

    let createEmbed = new MessageEmbed()
        .setColor('#98fc03')
        .setTitle('Lost Ark LFG Party Creation')
        .setDescription('Need people to fill your party? Create a Looking-for-Group request here!')
        .addFields(
            { 
                name: 'Party Types', 
                value: party_types 
            },
        )
        .setThumbnail('https://i.imgur.com/nSOFQJY.png')
    return createEmbed;
} 

// create party boilerplate for interaction buttons
function createButtons(){
    let row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId('create-party')
                .setLabel('Create Party')
                .setStyle('SUCCESS'),
        );
    return row;
}

// Handling the setup of create channel
function handleSetup(client, message){
    client.channels.cache.get(message.channel.id).send({
        embeds: [createEmbed()],
        components: [createButtons()]
    });
    message.delete();
}

// create dropdown options for gamemode selection
function createGamemodeOptions(default_id = null){
    let gamemode_options = [];
    for (const [key, value] of Object.entries(gamemodes)) {
        // Setup the option as per discord requirement
        let option = {
            label: value.display,
            value: key
        };
        // Set as default if a default id has been specified
        if (default_id != null && key == default_id){
            option.default = true
        }
        gamemode_options.push(option);
    }
    return gamemode_options;
}

// create dropdown options for activity selection
function createActivityOptions(gamemode_id){
    let activity_options = [];
    for (const [key, value] of Object.entries(gamemodes[gamemode_id]['options'])) {
        // Setup the option as per discord requirement
        let option = {
            label: value.display,
            value: key
        };
        activity_options.push(option);
    }
    return activity_options;
}

// create confirmation embed for lfg selections
function createConfirmationEmbed(gamemode_id, activity_id){
    let confirmationEmbed = new MessageEmbed()
        .setColor('#98fc03')
        .setTitle('LFG Party Creation Confirmation')
        .addFields(
            { 
                name: 'Game Mode', 
                value: gamemodes[gamemode_id].display 
            },
            { 
                name: 'Activity Selection', 
                value: gamemodes[gamemode_id]['options'][activity_id].display  
            }
        )
        .setThumbnail('https://i.imgur.com/nSOFQJY.png')
        .setFooter({ text: 'Made a mistake? Simply dismiss this message and start another one!' });
    return confirmationEmbed;
}

// create confirmation buttons for lfg selections
function createConfirmationButtons(){
    let row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId('confirm-party')
                .setLabel('Confirm Party')
                .setStyle('SUCCESS')
        );
    return row;
}

// Handling the interaction with users creating a party
async function handleCreateParty(interaction){
    const gamemode_row = new MessageActionRow()
        .addComponents(
            new MessageSelectMenu()
                .setCustomId('gamemode-select')
                .setPlaceholder('Select Gamemode')
                .addOptions(createGamemodeOptions()),
        );
    await interaction.reply({ 
        content: 'Please select the party you would like to create:', 
        ephemeral: true, 
        components: [gamemode_row]
    });
}

// Handling the interaction of choosing an activity after a gamemode has been selected
async function handleGamemodeSelect(interaction){
    // at this point the user should have chosen a gamemode
    // let's fetch their answer
    let gamemode_id = interaction.values[0];
    const gamemode_row = new MessageActionRow()
        .addComponents(
            new MessageSelectMenu()
                .setCustomId('gamemode-select')
                .setPlaceholder('Select Gamemode')
                .addOptions(createGamemodeOptions(gamemode_id)),
        );
    const activity_row = new MessageActionRow()
        .addComponents(
            new MessageSelectMenu()
                .setCustomId('activity-select')
                .setPlaceholder('Select Activity')
                .addOptions(createActivityOptions(gamemode_id)),
        );
    await interaction.deferUpdate();
    await interaction.editReply({
        ephemeral: true, 
        components: [gamemode_row, activity_row]
    });
}

async function handleActivitySelect(interaction){
    await interaction.deferUpdate();
    let gamemode_id;
    // since activity select is the interaction trigger, we have to dig
    // for the gamemode-select value
    for (component_row of interaction.message.components){
        let component = component_row.components[0];
        if (component.customId == 'gamemode-select') {
            for (option of component.options){
                // once we found the default value, this means that this was the gamemode-select value
                if (option.default) {
                    gamemode_id = option.value;
                }
            }
        } 
    }
    let activity_id = interaction.values[0];

    // Create Embed Message
    message = "You have selected the following options... \n" +
                "Once you are ready, please click the 'Confirm Party' button";
    await interaction.editReply({
        content: message,
        ephemeral: true,
        embeds: [createConfirmationEmbed(gamemode_id, activity_id)],
        components: [createConfirmationButtons()]
    });
}



// create party embed for lfg list message
function partyEmbed(user, gamemode_id, activity_id, title = null, description = null){
    let partyEmbed = new MessageEmbed()
        .setColor('#98fc03')
        .setAuthor({ 
            name: user.username,
            iconURL: user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail('https://i.imgur.com/nSOFQJY.png');
    if (title) {
        partyEmbed.setTitle(title);
    } else {
        partyEmbed.setTitle(`${gamemodes[gamemode_id].display} - ${gamemodes[gamemode_id]['options'][activity_id].display}`);
    }
    if (description) {
        partyEmbed.setDescription(description);
    }
    return partyEmbed;
}

// create party buttons for lfg list message
function partyButtons(){
    let row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId('join-party')
                .setLabel('Join')
                .setStyle('SUCCESS')
        )
        .addComponents(
            new MessageButton()
                .setCustomId('leave-party')
                .setLabel('Leave')
                .setStyle('DANGER')
        );
    return row;
}

function getGamemodeId(name){
    return Object.keys(gamemodes).find(key => gamemodes[key].display == name);
}

function getActivityId(gamemode_id, name){
    return Object.keys(gamemodes[gamemode_id]['options']).find(
        key => gamemodes[gamemode_id]['options'][key].display == name
    );
}

function getGamemodeAndActivityFromEmbed(embed){
    let options = {}
    for (field of embed.fields){
        if (field.name == 'Game Mode') {
            options.gamemode_name = field.value;
        }
        if (field.name == 'Activity Selection') {
            options.activity_name = field.value;
        }
    }
    options.gamemode_id = getGamemodeId(options.gamemode_name);
    options.activity_id = getActivityId(options.gamemode_id, options.activity_name);
    return options;
}

async function handleConfirmParty(client, interaction){
    options = getGamemodeAndActivityFromEmbed(interaction.message.embeds[0])
    createParty(client, interaction.user, options.gamemode_id, options.activity_id);
    await interaction.deferUpdate();

    let message = `Your LFG request has been posted at <#${config['list-channel-id']}>\n` +
                    "You may now dismiss this message";
    await interaction.editReply({
        ephemeral: true, 
        components: [],
        embeds: [],
        content: message
    });
}

// Function to ultimately create a party
function createParty(client, creator, gamemode_id, activity_id, title = null, description = null) {
    client.channels.cache.get(config['list-channel-id']).send({
        embeds: [partyEmbed(creator, gamemode_id, activity_id, title, description)],
        components: [partyButtons()]
    });
}

module.exports.handleSetup = handleSetup;
module.exports.handleCreateParty = handleCreateParty;
module.exports.handleGamemodeSelect = handleGamemodeSelect;
module.exports.handleActivitySelect = handleActivitySelect;
module.exports.handleConfirmParty = handleConfirmParty;