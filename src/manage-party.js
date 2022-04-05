const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu, Permissions, MessageAttachment } = require('discord.js');
const { Modal, TextInputComponent, showModal } = require('discord-modals');
const gamemodes = require('../config/gamemodes.json');
const config = require('../config/config.json');

// database.js handles all sqlite3 operations with the file backend
const database = require('./database');
// Import our other functionalities
const create_party = require('./create-party');
const { logger } = require('./logger');

function partyManageEmbed(){
    let manageEmbed = new MessageEmbed()
        .setColor('#98fc03')
        .setTitle('Manage Party')
        .setDescription('Need to make modifications to your party?')
        .addFields(
            {
                name: "Finalize/Relist",
                value: "Removes/Relist the party listing in LFG List"
            },
            {
                name: "Kick",
                value: "Forcibly removes a party member from the party"
            },
            {
                name: "Customize",
                value: "Customize the title or add a description to your party"
            },
            {
                name: "Archive",
                value: "Removes the listing from LFG List"
            }
        )
        .setThumbnail('https://i.imgur.com/nSOFQJY.png');
    return manageEmbed;
} 

function partyManageButtons(finalized = false){
    let row = new MessageActionRow();

    if (!finalized){
        row.addComponents(
            new MessageButton()
                .setCustomId(`finalize-party`)
                .setLabel('Finalize')
                .setStyle('SUCCESS')
        )
        .addComponents(
            new MessageButton()
                .setCustomId(`customize-party`)
                .setLabel('Customize')
                .setStyle('PRIMARY')
        );
    } else {
        row.addComponents(
            new MessageButton()
                .setCustomId(`relist-party`)
                .setLabel('Relist')
                .setStyle('SECONDARY')
        );
    }
    row.addComponents(
        new MessageButton()
            .setCustomId(`kick-party`)
            .setLabel('Kick')
            .setStyle('DANGER')
    )
    .addComponents(
        new MessageButton()
            .setCustomId(`archive-party`)
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
        database.updateManageId(thread_id, message.id);
    })
}

function updateManageMessage(client, thread_id, post_id, finalized = true){
    const channel = client.channels.cache.get(thread_id);
    channel.messages.fetch(post_id).then((message) => {
        message.edit({
            components: [partyManageButtons(finalized)]
        });
    }).catch((err) => {
        logger.info(`Attempted to edit a manage message (${post_id}) that is already deleted`);
    })
}

async function handleCustomizeParty(client, interaction){
    // Interaction hack so we can retrieve dropdown menu data after the modal is submitted
    // We can delete all other options that are not selected by users, then later retrieve it in the modal!

    // remove customId prefix and pass along thread-id
    const thread_id = interaction.message.channelId;
    // check if user is the creator of the party or if they are an admin
    const party_info = await database.getPartyInfoFromThreadId(thread_id);
    //logger.info(`Current user: ${interaction.user.username}${interaction.user.discriminator}(${interaction.user.id}), Party Leader: ${party_info.leader_id}`);
    //logger.info(`Current has permission to manage message: ${interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)}`);
    if (interaction.user.id != party_info.leader_id && !interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)){
        await interaction.reply({ ephemeral: true, 
            content: 'You do not have permissions to customize this.'});
    } else {
        logger.info(`Customization request from ${interaction.user.username}${interaction.user.discriminator} in thread ${thread_id}`);
        const modal = new Modal() // We create a Modal
            .setCustomId(`customize-party-modal-${thread_id}`)
            .setTitle('Customize this LFG!')
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
}

async function handleCustomizeSubmit(client, modal){
    // remove customId prefix and pass along thread-id
    const thread_id = modal.customId.replace(/^(customize-party-modal-)/,'');
    // check if user is the creator of the party or if they are an admin
    const party_info = await database.getPartyInfoFromThreadId(thread_id);
    //logger.info(`Current user: ${modal.user.username}${modal.user.discriminator}(${modal.user.id}), Party Leader: ${party_info.leader_id}`);
    //logger.info(`Current has permission to manage message: ${modal.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)}`);
    if (modal.user.id != party_info.leader_id && !modal.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)){
        await modal.deferReply({ ephemeral: true });
        modal.followUp({ content: 'You do not have permissions to customize this.', ephemeral: true });
    } else {
        let title = null;
        let description = null;
        for (field of modal.fields){
            if (field.customId == 'lfg-party-title') {
                title = field.value;
            }
            if (field.customId == 'lfg-description') {
                description = field.value;
            }
        }

        // Modal's channel ID is not from the thread id, which is completely useless
        // We had to augment each customize button with the thread id it comes from
        logger.info(`Customization received from thread id ${thread_id}, title: ${title}, desc: ${description}`)
        await modal.deferReply({ ephemeral: true })
        // Perform updates
        let updated = false;
        if (title) {
            database.updateTitle(thread_id, title);
            updated = true;
        }
        if (description) {
            database.updateDescription(thread_id, description);
            updated = true;
        }
        if (updated){
            post_id = await database.getPostIdFromThreadId(thread_id);
            create_party.refreshPartyEmbed(client, post_id, modal);
            modal.followUp({ content: 'Your customization has been applied!', ephemeral: true });
        } else {
            modal.followUp({ content: 'No changes detected!', ephemeral: true });
        }
    }
}

async function removePartyListing(client, post_id){
    const channel = client.channels.cache.get(config['list-channel-id']);
    channel.messages.fetch(post_id).then(message => {
        logger.info(`Deleting party listing post (${message.id})`);
        message.delete();
    }).catch((err) => {
        logger.info(`Attempted to delete a listing message (${post_id}) that is already deleted`);
    })
}

async function removeManageEmbed(client, thread_id){
    const post_id = await database.getManageIdFromThreadId(thread_id);
    const channel = client.channels.cache.get(thread_id);
    channel.messages.fetch(post_id).then((message) => {
        message.delete();
    }).catch((err) => {
        logger.info(`Attempted to delete a manage message (${post_id}) that is already deleted`);
    })
}

async function handleArchiveParty(client, interaction){
    const thread_id = interaction.message.channelId;
    console.log(thread_id);
    // check if user is the creator of the party or if they are an admin
    let party_info = await database.getPartyInfoFromThreadId(thread_id);
    if (interaction.user.id != party_info.leader_id && !interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)){
        await interaction.reply({ ephemeral: true, 
            content: 'You do not have permissions to do this.'});
    } else {
        logger.info(`Archive request from ${interaction.user.username}${interaction.user.discriminator} in thread ${thread_id}`);
        await interaction.deferReply();
        const channel = client.channels.cache.get(config['list-channel-id']);
        const thread = channel.threads.cache.get(thread_id);
        // Attempt to remove LFG post if it still exists
        removePartyListing(client, party_info.post_id);
        removeManageEmbed(client, thread_id);
        // Archive thread so no new messages may be posted by normal members
        await thread.setLocked(true);
        await thread.setArchived(true);
        // Remove listing from database
        database.removeParty(thread_id);
        // Send reply
        await interaction.editReply({ 
            content: `Thread has been locked as requested by <@${interaction.user.id}>!`, 
        });
    }
}

async function readyCheck(client, party_info){
    const notify = JSON.parse(party_info.members);
    if (notify.length > 0){
        let notify_msg = "Ready Check: ";
        for (member of notify){
            notify_msg += `<@${member}>`;
        }
        const channel = client.channels.cache.get(party_info.thread_id);
        channel.send(notify_msg);
    }
}

async function forcedReadyCheck(client, party_info, interaction){
    const members = JSON.parse(party_info.members);
    const notify = members.filter(member => member != interaction.user.id);
    // We don't want to notify whoever clicked on the finalize button
    if (notify.length > 0){
        let notify_msg = "Ready Check: ";
        for (member of notify){
            notify_msg += `<@${member}>`;
        }
        const channel = client.channels.cache.get(party_info.thread_id);
        channel.send(notify_msg);
    }
}

// This function handles finalizing the party in 2 different cases
// Either the party is full, or the party/admin clicked the finalize button
async function finalizeParty(client, interaction, full = false){
    // Check if the party naturally filled up to max causing the finalize
    if(full){
        // if this executes, then the party has naturally filled up
        const post_id = interaction.message.id;
        const party_info = await database.getPartyInfoFromPostId(post_id);
        logger.info(`Party has finalized because it is now full in post ${post_id}`);
        // remove from listings
        removePartyListing(client, party_info.post_id);
        readyCheck(client, party_info);
        updateManageMessage(client, party_info.thread_id, party_info.manage_id, true);
        // send the finalized party embed
        const channel = client.channels.cache.get(party_info.thread_id);
        interaction.guild.members.fetch(party_info.leader_id)
        .then(async (creator) => {
            channel.send({ 
                content: `Party is now full!`, 
                embeds: [create_party.partyEmbed(
                    creator.user, 
                    party_info.gamemode_id, 
                    party_info.activity_id, 
                    party_info.party_title, 
                    party_info.party_desc, 
                    JSON.parse(party_info.members))]
            });
        }).catch(async (err) => {
            // Oh no, the member has already left, we should use whoever interacted with this to finish out
            channel.send({ 
                content: `Party is now full!`, 
                embeds: [create_party.partyEmbed(
                    interaction.user, 
                    party_info.gamemode_id, 
                    party_info.activity_id, 
                    party_info.party_title, 
                    party_info.party_desc, 
                    JSON.parse(party_info.members))]
            });
        });   
    } else {
        // if this executes, someone has forced the finalize
        const thread_id = interaction.message.channelId;
        const party_info = await database.getPartyInfoFromThreadId(thread_id);
        if (interaction.user.id != party_info.leader_id && !interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)){
            await interaction.reply({ ephemeral: true, 
                content: 'You do not have permissions to customize this.'});
        } else {
            await interaction.deferReply();
            logger.info(`Finalize request from ${interaction.user.username}${interaction.user.discriminator} in thread ${thread_id}`);
            // Attempt to remove LFG post if it still exists
            removePartyListing(client, party_info.post_id);
            forcedReadyCheck(client, party_info, interaction);
            updateManageMessage(client, thread_id, party_info.manage_id, true);
            // if the creator still exists in the discord guild
            interaction.guild.members.fetch(party_info.leader_id)
                .then(async (creator) => {
                    await interaction.editReply({ 
                        content: `Party has been finalized by <@${interaction.user.id}>!`, 
                        embeds: [create_party.partyEmbed(
                            creator.user, 
                            party_info.gamemode_id, 
                            party_info.activity_id, 
                            party_info.party_title, 
                            party_info.party_desc, 
                            JSON.parse(party_info.members))]
                    });
                }).catch(async (err) => {
                    // Oh no, the member has already left, we should use whoever interacted with this to finish out
                    await interaction.editReply({ 
                        content: `Party has been finalized by <@${interaction.user.id}>!`, 
                        embeds: [create_party.partyEmbed(
                            interaction.user, 
                            party_info.gamemode_id, 
                            party_info.activity_id, 
                            party_info.party_title, 
                            party_info.party_desc, 
                            JSON.parse(party_info.members))]
                    });
                });   
        }
    }
}

async function handleJoinParty(client, interaction){
    // Defer reply for processing
    await interaction.deferReply({ ephemeral: true});
    const post_id = interaction.message.id;
    const party_info = await database.getPartyInfoFromPostId(post_id);
    const members = JSON.parse(party_info.members);
    if (members.includes(interaction.user.id)){
        await interaction.editReply({
            ephemeral: true,
            content: "You cannot join a party you are already part of!"
        });
    } else if (party_info.num_members >= gamemodes[party_info.gamemode_id]['options'][party_info.activity_id].size) {
        await interaction.editReply({
            ephemeral: true,
            content: "You cannot join a party that is already full!"
        });
    } else {
        members.push(interaction.user.id);
        // Send a ping in the party thread
        const channel = client.channels.cache.get(party_info.thread_id);
        channel.send(`${interaction.user} has joined the party!`);
        // Update the database with the change
        database.updatePartyMembers(post_id, members.length, JSON.stringify(members));
        // check if the party is now full
        if (members.length >= gamemodes[party_info.gamemode_id]['options'][party_info.activity_id].size){
            // if the party is full, fire off a finalize
            finalizeParty(client, interaction, true);
        } else {
            create_party.refreshPartyEmbed(client, post_id, interaction);
        }
        await interaction.editReply({
            ephemeral: true,
            content: "You have joined the party!"
        });
    }
}

async function handleLeaveParty(client, interaction){
    // Defer reply for processing
    await interaction.deferReply({ ephemeral: true});
    const post_id = interaction.message.id;
    const party_info = await database.getPartyInfoFromPostId(post_id);
    const members = JSON.parse(party_info.members);
    if (party_info.leader_id == interaction.user.id) {
        await interaction.editReply({
            ephemeral: true,
            content: "You cannot leave a party that you are a leader of. If you must, please archive this LFG!"
        });
    } else if (!members.includes(interaction.user.id)){
        await interaction.editReply({
            ephemeral: true,
            content: "You cannot leave a party you were never part of!"
        });
    } else {
        const new_members = members.filter(member => member != interaction.user.id);
        // Send a ping in the party thread
        const channel = client.channels.cache.get(party_info.thread_id);
        await channel.send(`${interaction.user} has left the party!`);
        // Remove the person from the thread
        const list_channel = client.channels.cache.get(config['list-channel-id']);
        const thread = list_channel.threads.cache.get(party_info.thread_id);
        thread.members.remove(interaction.user.id);
        // Update the database with the change
        database.updatePartyMembers(post_id, new_members.length, JSON.stringify(new_members));
        // refresh embed
        create_party.refreshPartyEmbed(client, post_id, interaction);
        await interaction.editReply({
            ephemeral: true,
            content: "You have left the party!"
        });
    }
}

// create dropdown options for kick selection
async function createKickOptions(guild, members){
    let kick_options = [];
    for (member_id of members) {
        // Setup the option as per discord requirement
        let current_member = await guild.members.fetch(member_id);
        let option = {
            label: current_member.nickname,
            value: member_id
        };
        kick_options.push(option);
    }
    return kick_options;
}

async function handleKickButton(client, interaction){
    // Defer reply for processing
    await interaction.deferReply({ ephemeral: true});
    const thread_id = interaction.message.channelId;
    // check if user is the creator of the party or if they are an admin
    let party_info = await database.getPartyInfoFromThreadId(thread_id);
    if (interaction.user.id != party_info.leader_id && !interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)){
        await interaction.editReply({ ephemeral: true, 
            content: 'You do not have permissions to kick.'});
    } else {
        logger.info(`Kick request from ${interaction.user.username}${interaction.user.discriminator} in thread ${thread_id}`);
        // Present select menu for kick
        const members = JSON.parse(party_info.members);
        const kick_selection = members.filter(member => member != party_info.leader_id);
        if (kick_selection.length < 1){
            await interaction.editReply({ ephemeral: true, 
                content: 'There is nobody to kick.'});
        } else {
            const kick_row = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId('kick-party-select')
                    .setPlaceholder('Select Player to Kick')
                    .addOptions(await createKickOptions(interaction.guild, kick_selection)),
            );
            await interaction.editReply({ 
                content: `Please select the user to kick:`, 
                components: [kick_row]
            });
        }
    }
}

async function handleKickSelection(client, interaction){
    // Defer reply for processing
    await interaction.deferUpdate({ ephemeral: true});
    const thread_id = interaction.message.channelId;
    // check if user is the creator of the party or if they are an admin
    let party_info = await database.getPartyInfoFromThreadId(thread_id);
    if (interaction.user.id != party_info.leader_id && !interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)){
        await interaction.editReply({ ephemeral: true, 
            content: 'You do not have permissions to kick.'});
    } else {
        logger.info(`Kick selection from ${interaction.user.username}${interaction.user.discriminator} in thread ${thread_id}`);
        const members = JSON.parse(party_info.members);
        const member_list = members.filter(member => member != party_info.leader_id);
        const kick_selection = interaction.values[0];
        if (member_list.includes(kick_selection)){
            const new_members = members.filter(member => member != kick_selection);
            // Send a ping in the party thread
            const channel = client.channels.cache.get(thread_id);
            channel.send(`<@${kick_selection}> has been kicked by ${interaction.user} from the party!`);
            // Remove said person from the thread
            const thread = channel.threads.cache.get(thread_id);
            thread.members.remove(kick_selection);
            // Update the database with the change
            database.updatePartyMembers(party_info.post_id, new_members.length, JSON.stringify(new_members));
            create_party.refreshPartyEmbed(client, party_info.post_id, interaction);
            await interaction.editReply({ 
                ephemeral: true, 
                content: 'Kick operation is successful.',
                components: []
            });
        } else {
            await interaction.editReply({ ephemeral: true, 
                content: 'You cannot kick that person. Actually, you should not even have encountered this...'});
        }
    }
}

async function handleRelist(client, interaction){
    // Defer reply for processing
    await interaction.deferReply({ ephemeral: true});
    const thread_id = interaction.message.channelId;
    // check if user is the creator of the party or if they are an admin
    let party_info = await database.getPartyInfoFromThreadId(thread_id);
    if (interaction.user.id != party_info.leader_id && !interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)){
        await interaction.editReply({ ephemeral: true, 
            content: 'You do not have permissions to relist this party.'});
    } else if (party_info.num_members >= gamemodes[party_info.gamemode_id]['options'][party_info.activity_id].size) {
        await interaction.editReply({ ephemeral: true, 
            content: 'You cannot relist a full party.'});
    } else {
        logger.info(`Relist request from ${interaction.user.username}${interaction.user.discriminator} in thread ${thread_id}`);
        // if the creator still exists in the discord guild
        interaction.guild.members.fetch(party_info.leader_id)
        .then((creator) => {
            client.channels.cache.get(config['list-channel-id']).send({
                embeds: [create_party.partyEmbed(
                    creator.user, 
                    party_info.gamemode_id, 
                    party_info.activity_id, 
                    party_info.party_title, 
                    party_info.party_desc, 
                    JSON.parse(party_info.members))],
                components: [create_party.partyButtons()]
            }).then(message => {
                database.updatePostIdByThreadId(thread_id, message.id);
            })
        }).catch((err) => {
            // Oh no, the member has already left, we should use whoever interacted with this to finish out
            client.channels.cache.get(config['list-channel-id']).send({
                embeds: [create_party.partyEmbed(
                    interaction.user, 
                    party_info.gamemode_id, 
                    party_info.activity_id, 
                    party_info.party_title, 
                    party_info.party_desc, 
                    JSON.parse(party_info.members))],
                components: [create_party.partyButtons()]
            }).then(message => {
                database.updatePostIdByThreadId(thread_id, message.id);
            })
        });
        const channel = client.channels.cache.get(thread_id);
        channel.send(`${interaction.user} has relisted this party!`);
        updateManageMessage(client, thread_id, party_info.manage_id, false);
        await interaction.editReply({ ephemeral: true, 
            content: 'Relist successful.'});
    }
}

// Function to initialize handlers for events
function setupEventListeners(client){
    // Interaction button processing
    client.on('interactionCreate', async interaction => {
        // We ignore everything that isn't a button press
        if (!interaction.isButton()) return;

        if (interaction.customId == 'customize-party'){
            handleCustomizeParty(client, interaction);
        } else if (interaction.customId == 'archive-party'){
            handleArchiveParty(client, interaction);
        } else if (interaction.customId == 'finalize-party'){
            finalizeParty(client, interaction, false);
        } else if (interaction.customId == 'join-party'){
            handleJoinParty(client, interaction);
        } else if (interaction.customId == 'leave-party'){
            handleLeaveParty(client, interaction);
        } else if (interaction.customId == 'kick-party'){
            handleKickButton(client, interaction);
        } else if (interaction.customId == 'relist-party'){
            handleRelist(client, interaction);
        } 
    });

    // Interaction dropdown menu processing
    client.on('interactionCreate', interaction => {
        if (!interaction.isSelectMenu()) return;

        if (interaction.customId == 'kick-party-select'){
            handleKickSelection(client, interaction);
        } 
    });

    // Modal submission processing
    client.on('modalSubmit', async (modal) => {
        if (modal.customId.startsWith('customize-party-modal')){
            handleCustomizeSubmit(client, modal);
        } 
    });
}

module.exports.setupManageMessage = setupManageMessage;
module.exports.setupEventListeners = setupEventListeners;