/* Express/Argon2/Helper Imports */
const express = require('express');
const token = require('../helpers/sessions');
const server = require('../helpers/server');
/* Get Router info from express */
const router = express.Router();

/* Check if user has valid session token */ /* Check if user has valid session token */ /* Check if user has valid session token */ 
/* Checks supplied sessionID against userID in relation DB, if so, allow user to login and send info as regular login */

// Order of queries/functions:
	// 0. STARTPOINT		- Setup connection/response
	// 1. SELECT			- From user_sessions for provided userID
		// 1.1 FAILOUT		- Fails and sends response if client did not send userID or a valid sessions token
		// 1.2 FAILOUT		- Fails and sends response if there is not sessionID for that user in DB
		// 1.3 FAILOUT		- Fails and sends response if token provided from client does not match one from DB
	// 2. SELECT			- From users as session info matches
		// 2.1 FAILOUT		- Fails and sends response if no user with that ID exists (Should not occur except from manual DB manipulation)
	// 3. ENDPOINT			- Send client success response

// Known issues:
	// - Uses same login logic as regular account login, if that one changes, this one needs to change too
		// Suggested Fix:
			// - None - Notes provided in ./routes/accounts.js to change both

// 0. STARTPOINT
router.post('/', (request, response) => {
	response.set({ 'Content-Type': 'application/json' });
	const connection = server.connect;

	select_usersessions(connection, response, request.body.userID, request.body.token);
});

// 1. SELECT
const select_usersessions = (connection, response, userID, userToken) => {
	if (userID && userToken && token.validate(userToken)) {
		connection.query(`SELECT sessionID FROM user_sessions WHERE userID = ?;`, [userID], (error, results) => {
			if (error) { server.endRequestFailure(error, response); return console.error(error); }

			if (results.length === 0) {
				// 1.2 FAILOUT
				server.endRequestFailure('No Session in DB', response);
			} else {
				if (results[0].sessionID === userToken) {
					select_users(connection, response, userID);
				} else {
					// 1.3 FAILOUT
					server.endRequestFailure('Session does not match DB', response);
				}
			}
		});
	} else {
		// 1.1 FAILOUT
		server.endRequestFailure('No Session Provided', response);
	}
}

// 2. SELECT
const select_users = (connection, response, userID) => {
	connection.query(`SELECT userID, username FROM users WHERE userID = ?;`, [userID], (error, results) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }

		if (results.length === 0) {
			// 2.1 FAILOUT
			server.endRequestFailure('That username does not exist...', response);
		} else {
			// 3. ENDPOINT
			server.endRequestSuccess(response, {
				userID: results[0].userID,
				username: results[0].username,
			});
		}
	});
}

module.exports = router;