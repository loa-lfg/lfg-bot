// For this bot, we're just ussing a simple sqlite backend
// This backend mostly stores the current party information so
// the bot doesn't have to scrape existing embed information for those

const sqlite3 = require('@vscode/sqlite3').verbose();
const { open } = require('sqlite');
const fs = require("fs");
const { logger } = require('./logger');

let db;
const db_file = './config/database.db';
const schema_file = './config/schema.sql';

// Check if the database file exists
if (!fs.existsSync(db_file)) {
    // If not, create an empty file
    logger.info('Database file does not exist');
    fs.open(db_file, 'w', (err, file) => {
        if (err) {
            throw err;
        }
        logger.info('Empty file created');
    });
}

// Open the database asynchronously
(async () => {
    db = await open({
      filename: db_file,
      driver: sqlite3.cached.Database
    })
    // Make sure that foreign key support is on because we use it
    db.exec("PRAGMA foreign_keys=ON");
    // Enable SQL tracing only for debug purposes
    // db.on('trace', (data) => {
    //     logger.info('SQL Trace');
    //     logger.info(data);
    // })
    // Check if the database has been setup already
    let check_result = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='party_list';");
    if (check_result == null){
        logger.info("Correct table was not found, importing schema");
        initializeDatabase();
        logger.info("Schema import completed");
    } else {
        logger.info("Correct table was found");
    }
    logger.info("Database connected");
})()


async function initializeDatabase(){
    const schema_sql = fs.readFileSync(schema_file).toString();
    const schema_array = schema_sql.split('/** STATEMENT SPLIT **/');
    for (statement of schema_array){
        await db.exec(statement);
    }
}

function insertParty(post_id, leader_id, thread_id, gamemode_id, activity_id, num_members, party_title, party_desc, members_json){
    db.run(`INSERT INTO party_list 
        (post_id, leader_id, thread_id, gamemode_id, activity_id, num_members, party_title, party_desc, members)
        VALUES (?,?,?,?,?,?,?,?,?)
    `, post_id, leader_id, thread_id, gamemode_id, activity_id, num_members, party_title, party_desc, members_json);
    logger.info(`DATABASE: Insert new post_id ${post_id}`);
}

function updateManageId(thread_id, manage_id){
    db.run("UPDATE party_list SET manage_id = ? WHERE thread_id = ?", manage_id, thread_id);
}

function updatePostIdByThreadId(thread_id, post_id){
    db.run("UPDATE party_list SET post_id = ? WHERE thread_id = ?", post_id, thread_id);
}

function updateTitle(thread_id, title){
    db.run("UPDATE party_list SET party_title = ? WHERE thread_id = ?", title, thread_id);
}

function updateDescription(thread_id, description){
    db.run("UPDATE party_list SET party_desc = ? WHERE thread_id = ?", description, thread_id);
}

function updatePartyMembers(post_id, num_members, members_json){
    db.run("UPDATE party_list SET num_members = ?, members = ? WHERE post_id = ?", num_members, members_json, post_id);
}

async function getPostIdFromThreadId(thread_id){
    let result = await db.get("SELECT post_id FROM party_list WHERE thread_id = ?", thread_id);
    return result.post_id;
}

async function getThreadIdFromPostId(post_id){
    let result = await db.get("SELECT thread_id FROM party_list WHERE post_id = ?", post_id);
    return result.thread_id;
}

async function getManageIdFromThreadId(thread_id){
    let result = await db.get("SELECT manage_id FROM party_list WHERE thread_id = ?", thread_id);
    return result.manage_id;
}

async function getPartyInfoFromPostId(post_id){
    let result = await db.get("SELECT * FROM party_list WHERE post_id = ?", post_id);
    return result;
}

async function getPartyInfoFromThreadId(thread_id){
    let result = await db.get("SELECT * FROM party_list WHERE thread_id = ?", thread_id);
    return result;
}

async function removeParty(thread_id){
    db.run("DELETE FROM party_list WHERE thread_id = ?", thread_id);
    logger.info(`DATABASE: Deleted listing with thread_id ${thread_id}`);
}

function updateMemberByPostId(post_id, num_members, members_json){
    db.run("UPDATE party_list SET num_members = ?, members = ? WHERE post_id = ?", 
    num_members, members_json, post_id);
}

function updateMemberByThreadId(thread_id, num_members, members_json){
    db.run("UPDATE party_list SET num_members = ?, members = ? WHERE thread_id = ?", 
    num_members, members_json, thread_id);
}

module.exports = {
    insertParty, updateManageId, updateTitle, updateDescription, getPostIdFromThreadId,
    getPartyInfoFromPostId, getThreadIdFromPostId, getPartyInfoFromThreadId, updateMemberByPostId,
    updateMemberByThreadId, getManageIdFromThreadId, removeParty, updatePartyMembers,
    updatePostIdByThreadId
}
