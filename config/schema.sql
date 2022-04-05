/**
Creates the party list table
**/
CREATE TABLE IF NOT EXISTS party_list (
	post_id text primary key,
	leader_id text not null,
	thread_id text unique not null,
	manage_id text unique,
	gamemode_id text not null,
	activity_id text not null,
	num_members integer not null,
	party_title varchar not null,
	party_desc blob,
	members blob not null
);
/** STATEMENT SPLIT **/

/**
Creates the notify list table of user_id and activity_id pairs
**/
CREATE TABLE IF NOT EXISTS notify_list (
	user_id text,
	activity_id text,
	primary key(user_id, activity_id)
);
/** STATEMENT SPLIT **/

/**
Creates the clean up check table so we can remind users to delete the party once they are done
**/
CREATE TABLE IF NOT EXISTS cleanup_check (
	post_id text primary key,
	last_update datetime not null default(CURRENT_TIMESTAMP),
	foreign key(post_id) references party_list(post_id)
	ON UPDATE CASCADE
	ON DELETE CASCADE
);
/** STATEMENT SPLIT **/

/**
Creates the trigger for cleanup_check table so whenever a party is created insert a new row in cleanup_check
**/
CREATE TRIGGER IF NOT EXISTS insert_update_time
	AFTER INSERT ON party_list
BEGIN
	INSERT INTO cleanup_check (
		post_id,
		last_update
	)
	VALUES
	(
		new.post_id, 
		CURRENT_TIMESTAMP
	);
END;
/** STATEMENT SPLIT **/

/**
Creates the trigger for cleanup_check table so whenever a party is modified, the last_update time reflect this
**/
CREATE TRIGGER IF NOT EXISTS refresh_update_time
	AFTER UPDATE ON party_list
	WHEN old.party_title <> new.party_title
	OR old.party_desc <> new.party_desc
	OR old.members <> new.members
BEGIN
	UPDATE cleanup_check 
	SET last_update = CURRENT_TIMESTAMP
	WHERE post_id = new.post_id;
END;