const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');
const config = require('../config/config.json');

// database.js handles all sqlite3 operations with the file backend
const database = require('./database');

function partyManageEmbed(){
    let manageEmbed = new MessageEmbed()
        .setColor('#98fc03')
        .setTitle('Manage Party')
        .setDescription('Need to make modifications to your party?')
        .addField(
            '**Button Explanation:**',
            "(Undo) Finalize - Removes or re-add the listing in LFG List\n"+
            "Kick - Forcibly removes a party member from the party\n"+
            "Customize - Customize the title or add a description to your party\n"+
            "Archive - Removes the listing from LFG List"
        )
        .setThumbnail('https://i.imgur.com/nSOFQJY.png');
    return manageEmbed;
} 

function partyManageButtons(finalized = false){
    let row = new MessageActionRow();

    if (!finalized){
        row.addComponents(
            new MessageButton()
                .setCustomId('finalize-party')
                .setLabel('Finalize')
                .setStyle('SUCCESS')
        )
    } else {
        row.addComponents(
            new MessageButton()
                .setCustomId('undo-finalize-party')
                .setLabel('Undo Finalize')
                .setStyle('SECONDARY')
        )
    }
    row.addComponents(
        new MessageButton()
            .setCustomId('kick-party')
            .setLabel('Kick')
            .setStyle('DANGER')
    )
    .addComponents(
        new MessageButton()
            .setCustomId('customize-party')
            .setLabel('Customize')
            .setStyle('PRIMARY')
    )
    .addComponents(
        new MessageButton()
            .setCustomId('archive-party')
            .setLabel('Archive')
            .setStyle('SECONDARY')
    );
    return row;
} 

function setupManageMessage(client, thread_id){
    client.channels.cache.get(thread_id).send({
        embeds: [partyManageEmbed()],
        components: [partyManageButtons()]
    }).then(message => {
        database.updateManageIdForThread(thread_id, message.id);
    })
}

async function handleCustomizeParty(client, interaction){
    // Interaction hack so we can retrieve dropdown menu data after the modal is submitted
    // We can delete all other options that are not selected by users, then later retrieve it in the modal!
    const modal = new Modal() // We create a Modal
        .setCustomId('create-party-modal')
        .setTitle('Customize your LFG!')
        .addComponents(
            new TextInputComponent() // We create a Text Input Component
                .setCustomId('lfg-party-title')
                .setLabel('Custom Party Title')
                .setStyle('SHORT') //IMPORTANT: Text Input Component Style can be 'SHORT' or 'LONG'
                .setMinLength(4)
                .setMaxLength(100)
                .setPlaceholder('Write your description here')
                .setRequired(false) // If it's required or not
        )
        .addComponents(
            new TextInputComponent() // We create a Text Input Component
                .setCustomId('lfg-description')
                .setLabel('Party Description')
                .setStyle('LONG') //IMPORTANT: Text Input Component Style can be 'SHORT' or 'LONG'
                .setMinLength(4)
                .setMaxLength(4000)
                .setPlaceholder('Specify additional information if necessary, e.g. Carry, T3 Map Share, Struggle, What time?')
                .setRequired(false) // If it's required or not
        );
    showModal(modal, {
        client: client,
        interaction, interaction
    });
}

async function handleModalSubmit(client, modal){
    options = getGamemodeAndActivityFromEmbed(modal.message.embeds[0])
    for (field of modal.fields){
        if (field.customId == 'lfg-party-title') {
            options.title = field.value;
        }
        if (field.customId == 'lfg-description') {
            options.description = field.value;
        }
    }
    createParty(client, modal.user, options.gamemode_id, options.activity_id, options.title, options.description);
    modal.deferReply();
    let message = `Your LFG request has been posted at <#${config['list-channel-id']}>\n` +
                    "You may now dismiss this message";
    modal.reply({
        ephemeral: true, 
        content: message
    });
    
}

module.exports.setupManageMessage = setupManageMessage;