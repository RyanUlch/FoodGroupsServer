// Table of Contents:
	// line 14	- /get		- Get Groups for User
	// line 42	- /join		- Join Groups with Password
	// line 119	- /create	- Create New Group
	// line	194	- /leave	- Leave Group
	
/* Express/Argon2/Helper Imports */
const express = require('express');
const argon2 = require('argon2');
const server = require('../helpers/server');
/* Get Router info from express */
const router = express.Router();

/* Get Groups for User */ /* Get Groups for User */ /* Get Groups for User */ /* Get Groups for User */ /* Get Groups for User */ 
/* Using supplied UserID, get all groupIDs and names associated to that ID */

// Order of queries/functions:
	// 0. STARTPOINT		- Setup connection/response
	// 1. SELECT			- From user_groups for associated userID
	// 2. ENDPOINT			- Send client success response with group information

// Known issues:
	// None

// 0. STARTPOINT
router.post('/get', (request, response) => {
	response.set({ 'Content-Type': 'application/json' });
	const connection = server.connect;

	// 1. SELECT
	connection.query(`SELECT groupID, groupName FROM \`groups\` WHERE groupID IN (SELECT groupID FROM user_groups WHERE userID=?);`, [request.body.userID], (error, results) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }

		const groupArr = [];
		results.forEach(result => groupArr.push({groupID: result.groupID, groupName: result.groupName}));

		// 2. ENDPOINT 
		server.endRequestSuccess(response, groupArr);
	});
});

/* Join Groups with Password */ /* Join Groups with Password */ /* Join Groups with Password */ /* Join Groups with Password */  
/* If client supplied correct groupName, and password, join that group */

// Order of queries/functions:
	// 0. STARTPOINT		- Setup connection/response
	// 1. SELECT			- From groups for associated groupName
		//1.1 FAILOUT		- There are no groups with provided name
	// 2. VERIFY			- Use Argon2 to verify if passwords match
		// 2.1 FAILOUT		- Password supplied from client does not match
	// 3. REPLACE			- Into user_groups as user successfully joined group
	// 4. SELECT			- From group_recipes to get recipeIDs associated with group
	// 5. ENDPOINT			- Send client success response with group info and new recipeIDs

// Known issues:
	// None

// 0. STARTPOINT
router.post('/join', (request, response) => {
	response.set({ 'Content-Type': 'application/json' });
	const connection = server.connect;

	join_select_groups(connection, response, request.body)
});

// 1. SELECT
const join_select_groups = (connection, response, body) => {
	console.log(1);
	connection.query(`SELECT * FROM \`groups\` WHERE groupName=?;`, [body.groupName], (error, results) => {
		console.log(error);
		if (error) { server.endRequestFailure(error, response); return console.error(error); }
		if (results.length) {
			join_verify(connection, response, body.groupPass, results[0], body.userID);
		} else {
			// 1.1 FAILOUT
			server.endRequestFailure('No Groups with that name created, feel free to create one!', response);
		}
	});
}

// 2. VERIFY
const join_verify = (connection, response, clientPass, groupInfo, userID) => {
	argon2.verify(groupInfo.groupPass, clientPass).then(verifiedPassword => {
		if (verifiedPassword) {
			join_replace_usergroups(connection, response, groupInfo, userID);
		} else {
			// 2.1 FAILOUT
			server.endRequestFailure('Password does not match', response);
		}
	});
}

// 3. REPLACE
const join_replace_usergroups = (connection, response, groupInfo, userID) => {
	connection.query(`REPLACE INTO user_groups (userID, groupID) VALUES (?, ?);`, [userID, groupInfo.groupID], (error) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }
		
		join_select_grouprecipes(connection, response, groupInfo);
	});
}

// 4. SELECT
const join_select_grouprecipes = (connection, response, groupInfo) => {
	connection.query(`SELECT * FROM group_recipes WHERE groupID=?;`, [groupInfo.groupID], (error, results) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }

		const list = [];
		for (const result of results) {
			list.push(result.recipeID);
		}
		// 5. ENDPOINT
		server.endRequestSuccess(response, {
			groupID: groupInfo.groupID,
			groupName: groupInfo.groupName,
			recipeIDs: list,
		});
	})
}

/* Create New Group */ /* Create New Group */ /* Create New Group */ /* Create New Group */ /* Create New Group */ 
/* Create a group with client supplied name and password */

// Order of queries/functions:
	// 0. STARTPOINT		- Setup connection/response
	// 1. SELECT			- From groups to see if groupName is taken
		//1.1 FAILOUT		- Group already exists
	// 2. HASH				- Use Argon2 to create hash for group password
	// 3. INSERT			- Into groups new groupName, and password
	// 4. GET ID			- Get GroupID by leveraging 'LAST_INSERT_ID()'
	// 5. INSERT			- Into user_groups to create association with new group
	// 2. ENDPOINT			- Send client success response with group info

// Known issues:
	// None

// 0. STARTPOINT
router.post('/create', (request, response) => {
	response.set({ 'Content-Type': 'application/json' });
	const connection = server.connect;

	create_select_groups(connection, response, request.body);
});

// 1. SELECT
const create_select_groups = (connection, response, body) => {
	connection.query(`SELECT * FROM \`groups\` WHERE groupName=?;`, [body.groupName], (error, results) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }
		if (results.length > 0) {
			// 1.1 FAILOUT
			server.endRequestFailure('Group name already taken', response);
		} else {
			create_hash(connection, response, body);
		}
	});
}

// 2. HASH
const create_hash = (connection, response, body) => {
	argon2.hash(`${body.groupPass}`).then(hashedPassword => {
		create_insert_groups(connection, response, hashedPassword, body);
	});
}

// 3. INSERT
const create_insert_groups = (connection, response, password, body) => {
	connection.query(`INSERT INTO \`groups\` (groupName, groupPass) VALUES (?, ?);`, [body.groupName, password], (error) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }

		create_id(connection, response, body);
	});
}

// 4. GET ID
const create_id = (connection, response, body) => {
	connection.query('SELECT LAST_INSERT_ID()', (error, results) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }
		create_insert_usergroups(connection, response, body, Number(results[0]['LAST_INSERT_ID()']));
	});
}

// 5. INSERT
const create_insert_usergroups = (connection, response, body, groupID) => {
	connection.query(`INSERT INTO user_groups (userID, groupID) VALUES (?, ?);`, [body.userID, groupID], (error) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }

		// 6. ENDPOINT
		server.endRequestSuccess(response, {
			groupID: groupID,
			groupName: body.groupName,
			recipeIDs: [],
		});
	});
}

/* Leave Group *//* Leave Group */ /* Leave Group */ /* Leave Group */ /* Leave Group */ /* Leave Group */ /* Leave Group */ 
/* Remove association with group for userID */

// Order of queries/functions:
	// 0. STARTPOINT		- Setup connection/response
	// 1. DELETE			- From user_groups to see disassociate
	// 2. ENDPOINT			- Send client success response

// Known issues:
	// None

// 0. STARTPOINT
router.post('/leave', (request, response) => {
	response.set({ 'Content-Type': 'application/json' });	
	const connection = server.connect;

	// 1. DELETE
	connection.query(`DELETE FROM user_groups WHERE userID=? AND groupID=?;`, [request.body.userID, request.body.groupID], (error) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }

		// 2. ENDPOINT
		server.endRequestSuccess(response);
	});
});

module.exports = router;