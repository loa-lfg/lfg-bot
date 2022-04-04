// For this bot, we're just ussing a simple sqlite backend
// This backend mostly stores the current party information so
// the bot doesn't have to scrape existing embed information for those

const sqlite3 = require('@vscode/sqlite3').verbose();
const fs = require("fs");
const { logger } = require('./logger');

let database;
const db_file = './config/database.db';
const schema_file = './config/schema.sql';
const db = new sqlite3.Database(db_file);

function initializeDatabase(){
    db.run('BEGIN TRANSACTION;');
    const schema_sql = fs.readFileSync(schema_file).toString();
    const schema_array = schema_sql.split('/** STATEMENT SPLIT **/');
    schema_array.forEach((query) => {
        if(query) {
            db.serialize(() => {
                db.run(query, (err) => {
                    if(err){
                        logger.error("SQL ERROR");
                        logger.error(err);
                        throw err;
                    } 
                });
            });
        }
    });
    db.run('COMMIT;');
}

function insertParty(post_id, leader_id, thread_id, gamemode_id, activity_id, num_members, party_title, party_desc, members_json){
    let stmt = db.prepare(`INSERT INTO party_list 
        (post_id, leader_id, thread_id, gamemode_id, activity_id, num_members, party_title, party_desc, members)
        VALUES (?,?,?,?,?,?,?,?,?)
    `);
    stmt.run(post_id, leader_id, thread_id, gamemode_id, activity_id, num_members, party_title, party_desc, members_json)
    stmt.finalize();
}

function updateManageIdForThread(thread_id, manage_id){
    let stmt = db.prepare("UPDATE party_list SET manage_id = ? WHERE thread_id = ?");
    stmt.run(manage_id, thread_id)
    stmt.finalize();
}

function getPartyInfo(post_id){
    let stmt = db.prepare("SELECT * FROM party_list WHERE post_id = ? LIMIT 1");
    let result = stmt.get(post_id);
    return result;
}

async function addMemberToParty(post_id, num_members, members_json){

}

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

// Check if the database has been setup already
// serialize makes sure that these are run in order
db.serialize(() => {
    // check if parties table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='party_list';", (error, rows) => {
        if (!rows) {
            logger.info("Correct table was not found, importing schema");
            initializeDatabase();
            logger.info("Schema import completed");
        } else {
            logger.info("Correct table was found");
        }
    })
});
logger.info("Database connected");

module.exports.insertParty = insertParty;
module.exports.updateManageIdForThread = updateManageIdForThread;