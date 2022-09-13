// Table of Contents:
	// line 12		- /addedit		- Add/Edit Recipe
	// line 120		- /delete		- Delete Recipe
	// line 195		- /get			- Get Recipes

/* Express/Helper Imports */
const express = require('express');
const server = require('../helpers/server');
/* Get Router info from express */
const router = express.Router();

/* Add/Edit Recipe */ /* Add/Edit Recipe */ /* Add/Edit Recipe */ /* Add/Edit Recipe */ /* Add/Edit Recipe */ /* Add/Edit Recipe */
/* Adds or updates recipe in mysql DB with affected relation tables also changed; if recipeID is defined, update, else add */

// Order of queries/functions:
// 0. STARTPOINT		- Setup connection/response
// 1. INSERT/UPDATE		- Into recipes
// 2. SELECT			- From recipes; Get newly create/old recipeID form DB
// 3. INSERT			- Into user_recipes
// 4. INSERT			- Into group_recipes if any groups are supplied (skips if none)
// 5. DELETE			- From group_recipes if any groups are supplied (skips if none)
// 6. SELECT			- From recipes to get DB provided data (datetime created)
// 7. ENDPOINT			- Send client selected table data above

// Known issues:
	// - If the first query passes, but any other query fails, the recipe will be entered into DB but won't have correct data for user_recipes/group_recipes,
	// and won't reach user for final selects
	// Suggested Fix:
		// - Create a backwords workflow that undoes previous queries, although this creates more issues as when a client supplies a delete from groups list
		// it is not known if those rows currently exist or not, adding them back could cause more issues.

// 0. STARTPOINT
router.post('/addedit', (request, response) => {
	response.set({ 'Content-Type': 'application/json' });
	const connection = server.connect;
	addedit_updateinsert_recipes(connection, response, request);
});

// 1. UPDATE/INSERT
const addedit_updateinsert_recipes = (connection, response, request) => {
	let firstQuery;
	const firstParams = [
		request.body.recipeName,
		request.body.recipeDescription,
		JSON.stringify(request.body.ingredients),
		JSON.stringify(request.body.instructions),
		request.body.userID,
		request.body.imagePath,
		request.body.servings,
	];
	if (request.body.recipeID) {
		firstQuery = `UPDATE INTO recipes (recipeName, recipeDescription, ingredients, instructions, owner, imgURL, servings recipeID) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`;
		firstParams.push(request.body.recipeID);
	} else { 
		firstQuery = `INSERT INTO recipes (recipeName, recipeDescription, ingredients, instructions, owner, imgURL, servings) VALUES (?, ?, ?, ?, ?, ?, ?);`;
	}

	connection.query(firstQuery, firstParams, (error) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }
		addedit_select_lastquery(connection, response, request.body);
	});
}

// 2. SELECT
const addedit_select_lastquery = (connection, response, body) => {
	connection.query('SELECT LAST_INSERT_ID();', (error, results) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }
		addedit_insert_userrecipes(connection, response, results[0]['LAST_INSERT_ID()'], body);
	});
}

// 3. INSERT
const addedit_insert_userrecipes = (connection, response, id, body) => {
	connection.query(`INSERT IGNORE INTO user_recipes (userID, recipeID) VALUES (?, ?);`, [body.userID, id], (error) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }
		addedit_insert_grouprecipes(connection, response, id, body);
	});
}

// 4. INSERT
const addedit_insert_grouprecipes = (connection, response, id,body) => {
	const groupsAddArr = body.groupsToAddTo;
	if (groupsAddArr.length > 0) { 	// If no groups provided, skip this query
		for (let i = 0; i < groupsAddArr; ++i) groupsAddArr[i].push(id);

		connection.query(`INSERT IGNORE INTO group_recipes (groupID, recipeID) VALUES ?;`, [groupsAddArr], (error) => {
			if (error) { server.endRequestFailure(error, response); return console.error(error); }
			addedit_delete_grouprecipes(connection, response, id, body);
		});
	} else {
		addedit_delete_grouprecipes(connection, response, id, body);
	}
}

// 5. DELETE
const addedit_delete_grouprecipes = (connection, response, id, body) => {
	const groupsDelArr = body.groupsToDeleteFrom;
	if (groupsDelArr.length > 0) { 	// If no groups provided, skip this query
		for (let i = 0; i < groupsDelArr; ++i) groupsDelArr[i].push(id);

		connection.query(`DELETE FROM group_recipes WHERE (groupID, recipeID) IN (?);`, [groupsDelArr], (error) => {
			if (error) { server.endRequestFailure(error, response); return console.error(error); }
			addedit_select_recipes(connection, response, id);
		});
	} else {
		addedit_select_recipes(connection, response, id);
	}
}

// 6. SELECT
const addedit_select_recipes = (connection, response, id) => {
	connection.query(`SELECT * FROM recipes WHERE recipeID=?;`, [id], (error, results) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }

		// 7. ENDPOINT
		server.endRequestSuccess(response, results);
	});
}

/* Delete Recipe */ /* Delete Recipe */ /* Delete Recipe */ /* Delete Recipe */ /* Delete Recipe */ /* Delete Recipe */ /* Delete Recipe */
/* Deletes recipe in mysql DB with affected relation tables also deleted */

// Order of queries/functions:
// 0. STARTPOINT		- Setup connection/response
// 1. SELECT			- From Recipes, used to verify user owns recipe
	// 1.1 FAILOUT		- No Recipe in DB with that recipeID (Should not occur except for manual DB manipulation)
	// 1.2 FAILOUT		- User does not own the recipe (Should not occur exept for manual DB manipulation)
// 2. DELETE			- From recipes for specified recipeID
// 3. DELETE			- From user_recipes for all users who 'favorited' recipe
// 4. DELETE			- From group_recipes for all groups that associated with recipe
// 5. ENDPOINT			- Send client selected table data above

// Known issues:
	// - Bad User could fake request suppling UserID that is not their's and delete recipes they do not own
	// Suggested Fix:
		// -I don't know... userID is only current verification method
	// - If first DELETE query succeeds but the others fail, there will be an association in DB pointing to a non-existant
	// recipe for user and/or groups
	// Suggested Fix:
		// Unknown, subsequent queries are simple and hard to fail, but no fail-safe in place

// 0. STARTPOINT
router.delete('/delete', (request, response) => {
	response.set({ 'Content-Type': 'application/json' });
	const connection = server.connect;
	delete_select_recipes(connection, response, request.body);
});

// 1. SELECT
const delete_select_recipes = (connection, response, body) => {
	connection.query(`SELECT * FROM recipes WHERE recipeID=?;`, [Number(body.recipeID)], (error, results) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }
		if (results.length > 0) {
			if (Number(results[0].owner) === Number(body.userID)) {
				delete_delete_recipes(connection, response, body.recipeID);
			} else {
				// 1.2 FAILOUT
				server.endRequestFailure('User is not the owner of this recipe', response);
			}
		} else {
			// 1.1 FAILOUT
			server.endRequestFailure('No Recipe with that ID', response);
		}
	})
}

// 2. DELETE
const delete_delete_recipes = (connection, response, recipeID) => {
	connection.query(`DELETE FROM recipes WHERE recipeID=?;`, [recipeID], (error) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }
		delete_delete_userrecipes(connection, response, recipeID);
	});
}

// 3. DELETE
const delete_delete_userrecipes = (connection, response, recipeID) => {
	connection.query(`DELETE FROM user_recipes where recipeID=?;`, [recipeID], (error) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }
		delete_delete_grouprecipes(connection, response, recipeID);
	});
}

// 4. DELETE
const delete_delete_grouprecipes = (connection, response, recipeID) => {
	connection.query(`DELETE FROM group_recipes WHERE recipeID=?;`, [recipeID], (error) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }
		// 5. ENDPOINT
		server.endRequestSuccess(response);
	});
}

/* Get Recipes */ /* Get Recipes */ /* Get Recipes */ /* Get Recipes */ /* Get Recipes */ /* Get Recipes */ /* Get Recipes */
/* Get all relavant recipes, from users owned recipes, users associated groups recipes, and users favorited recipes*/

// Order of queries/functions:
// 0. STARTPOINT		- Setup connection/response
// 1. SELECT			- From user_recipes, as user has owned or favorited these
	// 1.1 FAILOUT		- No UserID was supplied, cannot continue
// 2. SELECT			- From group_recipes, as users associated groups has these recipe associations
// 3. SELECT			- From recipes for all recipes associated with user/groups
	// 3.1 ENDEARLY		- Queries succeeded, but there is no recipes to send to client
// 4. ENDPOINT			- Send client recipe information

// Known issues:
	// - None

// 0. STARTPOINT
router.post('/get', (request, response) => {
	response.set({ 'Content-Type': 'application/json' });
	const connection = server.connect;

	get_select_userrecipes(connection, response, request.body.userID, request.body.groups.map(group => group.groupID))
});

// 1. SELECT
const get_select_userrecipes = (connection, response, userID, groupIDs) => {
	if (userID) {

		// Create and initialize object that will be returned to client with recipe info,
		// Includes the actual recipes, but also the associated data for where they are from
		const recipeObj = { userRecipes: [], allRecipes: [], recipes: [], };
		groupIDs.forEach(group => {	recipeObj[group] = []; });

		connection.query(`SELECT recipeID FROM user_recipes WHERE userID = ?;`, [userID], (error, results) => {
			if (error) { server.endRequestFailure(error, response); return console.error(error); }

			// Add results to both users and all recipe associations in object to be returned to client
			results.forEach(result => {
				recipeObj.userRecipes.push(result.recipeID);
				recipeObj.allRecipes.push(result.recipeID)
			});

			get_select_grouprecipes(connection, response, groupIDs, recipeObj, userID)
		});
	} else {
		// 1.1 FAILOUT
		server.endRequestFailure('No UserID was supplied', response);
	}
}

// 2. SELECT
const get_select_grouprecipes = (connection, response, groupIDs, recipeObj, userID) => {
	if (groupIDs.length > 0) { // If no groups provided, skip this query
		connection.query(`SELECT recipeID, groupID FROM group_recipes WHERE groupID IN (?);`, [groupIDs], (error, results) => {
			if (error) { server.endRequestFailure(error, response); return console.error(error); }

			// Add results to both groups and all recipe associations in object to be returned to client
			results.forEach(result => {
				recipeObj[result.groupID].push(result.recipeID);
				recipeObj.allRecipes.push(result.recipeID);
			});
			
			get_select_recipes(connection, response , recipeObj, userID);
		});
	} else {
		get_select_recipes(connection, response, recipeObj, userID);
	}
}

// 3. SELECT
const get_select_recipes = (connection, response, recipeObj, userID) => {
	// Make sure allRecipes are unique by leveraging Set
	const recipes = recipeObj.allRecipes.length ? [...new Set(recipeObj.allRecipes)] : [-1];
	connection.query(`SELECT * FROM recipes WHERE recipeID IN (?) OR owner=?;`, [recipes, userID], (error, results) => {
		if (error) { server.endRequestFailure(error, response); return console.error(error); }

		if (results.length > 0) {
			// Create new recipe in object to be returned with all data
			results.forEach(result => {
				recipeObj.recipes.push({
					recipeID: result.recipeID,
					recipeName: result.recipeName,
					recipeDescription: result.recipeDescription,
					ingredients: JSON.parse(result.ingredients),
					instructions: JSON.parse(result.instructions),
					date: result.date,
					owner: result.owner,
					url: result.imgURL,
					servings: result.servings,
				});
			});
			// 4. ENDPOINT
			server.endRequestSuccess(response, recipeObj);
		} else {
			// 3.1 ENDEARLY
			server.endRequestFailure('No Recipes', response);
		}
	});
}

module.exports = router;