// Table of Contents:
	// line 12		- /login	- Check if user can log in
	// line 86		- /signup	- Add user to DB
	// line 179		- /addFav	- Add Favorite Recipe
	// line 204		- /remFav	- Remove Favorite Recipe

/* Express/Argon2/Helper Imports */
const express = require('express');
const argon2 = require('argon2');
const server = require('../helpers/server');
const token = require('../helpers/sessions');
/* Get Router info from express */
const router = express.Router();

/* Check if user can log in */ /* Check if user can log in */ /* Check if user can log in */ /* Check if user can log in */
/* Checks supplied username/password supplied by client against DB, if successful, creates, sends and logs a sessionID */

// Order of queries/functions:
	// 0. STARTPOINT		- Setup connection/response
	// 1. SELECT			- From users for supplied username
		// 1.1 FAILOUT		- Fails and sends response if username and password is not supplied
		// 1.2 FAILOUT		- Fails and sends response if username does not exist in DB
	// 2. VERIFY			- Use Argon2 to verify that supplied password matches DB for user
		// 2.1 FAILOUT		- Fails and sends response if password supplied does not pass verification
	// 3. REPLACE			- Into user_sessions a new sessionID for a successful login
	// 4. ENDPOINT			- Send client success response

// Known issues:
	// None

// Notes: 
	// Uses same login logic as the checking session data route - CHANGE ./routes/sessions.js upon changing 1. SELECT

// 0. STARTPOINT
router.post('/login', (request, response) => {
	response.set({ 'Content-Type': 'application/json' });
	const connection = server.connect;

	login_select_users(connection, response, request.body.username, request.body.password);
});

// 1. SELECT
const login_select_users = (connection, response, username, password) => {
	if (username && password) {
		connection.query(`SELECT password, userID, username FROM users WHERE username = ?;`, [username], (error, results) => {
			if (error) { server.endRequestFailure(error, response); return console.error(error); }

			if (results.length === 0) {
				// 1.2 FAILOUT
				server.endRequestFailure('That username does not exist...', response);
			} else {
				login_verify_password(connection, response, results[0], password);
			};
		});
	} else {
		// 1.1 FAILOUT
		server.endRequestFailure('Please enter username and password', response);
	};
}

// 2. VERIFY
const login_verify_password = (connection, response, results, clientPass) => {
	argon2.verify(results.password, clientPass).then(verifiedPassword => {
		if (verifiedPassword) {
			login_replace_usersessions(connection, response, results);
		} else {
			// 2.1 FAILOUT
			server.endRequestFailure('That password is incorrect', response);
		}
	});
}

// 3. REPLACE
const login_replace_usersessions = (connection, response, userInfo) => {
	const sessionID = token.generate(userInfo.userID);
	connection.query(`REPLACE INTO user_sessions (userID, sessionID) VALUES (?, ?);`, [userInfo.userID, sessionID], (error) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }

		// 4. ENDPOINT
		server.endRequestSuccess(response, {
			userID: userInfo.userID,
			username: userInfo.username,
			sessionID: sessionID,
		});
	});
}

/* Add user to DB */ /* Add user to DB */ /* Add user to DB */ /* Add user to DB */ /* Add user to DB */ /* Add user to DB */
/* Add User to DB if all data is valid */

// Order of queries/functions:
	// 0. STARTPOINT		- Setup connection/response
	// 1. SELECT			- From users for supplied username
		// 1.1 FAILOUT		- Client did not supply username, email, or password
		// 1.2 FAILOUT		- Username or Email is already in use
	// 2. HASH				- Uses Argon2 to hash password for safe storage
	// 3. INSERT			- Into users a newly created account
	// 4. GET ID			- Use 'Last_Insert_ID()' to get the userID for new account
		// 4.1 FAILOUT		- No ID was povided, not sure what could cause this if previous insert succeeded
	// 5. INSERT			- Create and add sessionID into user_sessions as if they logged in
	// 6. ENDPOINT			- Send client success response

// Known issues:
	// - Currently no email confirmation for users, email may not be correct, this means accounts cannot be verified,
	// nor can reset password emails be sent, there is no current way for user to reset password.
	// Suggested Fix:
		// - Currently none - website is not scaled for worldwide audience, and does not need to prevent fake accounts
		// - If userbase grows, will need to add email confirmation before accounts can add/join groups/recipes

// 0. STARTPOINT
router.post('/signup', (request, response) => {
	response.set({ 'Content-Type': 'application/json' });
	const connection = server.connect;

	signup_select_users(connection, response, request.body.username, request.body.email, request.body.password);	
});

// 1. SELECT
const signup_select_users = (connection, response, username, email, password) => {
	if (username && email && password) {
		connection.query('SELECT userID FROM users WHERE username=? or email=?;', [username, email], (error, results) => {
			if (error) { server.endRequestFailure(error, response); return console.error(error); }

			if (results.length > 0) {
				// 1.2 FAILOUT
				server.endRequestFailure('That username or email is already taken...', response);
			} else {
				signup_hash_password(connection, response, password, username, email);
			};
		});
	} else {
		// 1.1 FAILOUT
		serverHelper.endRequestFailure('Please enter username, email and password', response);
	};
}

// 2. HASH
const signup_hash_password = (connection, response, password, username, email) => {
	argon2.hash(`${password}`).then(hashedPassword => {
		signup_insert_users(connection, response, username, email, hashedPassword)
	});
}

// 3. INSERT
const signup_insert_users = (connection, response, username, email, password) => {
	connection.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?);', [username, email, password], (error) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }

		signup_id(connection, response, username);
	});
}

// 4. GET ID
const signup_id = (connection, response, username) => {
	connection.query('SELECT LAST_INSERT_ID();', (error, results) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }
		if (results.length > 0) {
			signup_insert_usersessions(connection, response, username, results[0]['LAST_INSERT_ID()']);
		} else {
			// 4.1 FAILOUT
			server.endRequestFailure('There was an unknown error adding a new account...', response);
		}
	})
}

// 5. INSERT
const signup_insert_usersessions = (connection, response, username, userID) => {
	const sessionID = token.generate(userID);
	connection.query(`INSERT INTO user_sessions (userID, sessionID) VALUES (?, ?);`, [userID, sessionID], (error) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }

		// 6. ENDPOINT
		server.endRequestSuccess(response, {
			userID: userID,
			username: username,
			sessionID: sessionID,
		});
	});
}

/* Add Favorite Recipe */ /* Add Favorite Recipe */ /* Add Favorite Recipe */ /* Add Favorite Recipe */ /* Add Favorite Recipe */
/* Adds relation in user_recipes so that recipe is associated with account regardless of ownership */

// Order of queries/functions:
	// 0. STARTPOINT		- Setup connection/response
	// 1. INSERT			- Into user_recipes, ignores if already set
	// 2. ENDPOINT			- Send client success response

// Known issues:
	// None

// 0. STARTPOINT
router.post('/addFav', (request, response) => {
	response.set({'Content-Type': 'application/json'});
	const connection = server.connect;

	// 1. INSERT
	connection.query(`INSERT IGNORE INTO user_recipes (userID, recipeID) VALUES (?, ?);`, [request.body.userID, request.body.recipeID], (error) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }

		// 2. ENDPOINT
		server.endRequestSuccess(response);
	});
});

/* Remove Favorite Recipe */ /* Remove Favorite Recipe */ /* Remove Favorite Recipe */ /* Remove Favorite Recipe */
/* Removes relation in user_recipes so that recipe is associated not with account - should not be possible if user is owner of recipe */

// Order of queries/functions:
	// 0. STARTPOINT		- Setup connection/response
	// 1. DELETE			- From user_recipes
	// 2. ENDPOINT			- Send client success response

// Known issues:
	// None

// 0. STARTPOINT
router.post('/remFav', (request, response) => {
	response.set({ 'Content-Type': 'application/json' });
	const connection = server.connect;

	// 1. DELETE
	connection.query(`DELETE FROM user_recipes WHERE userID=? AND recipeID=?;`, [request.body.userID, request.body.recipeID], (error) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }

		// 2. ENDPOINT
		server.endRequestSuccess(response);
	});
});

module.exports = router;