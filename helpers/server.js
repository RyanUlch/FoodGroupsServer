// MySQL import
const mysql = require('mysql');
// Environment Variables
// require('dotenv').config();

// Connection information - Change here when Server changes
const connect = mysql.createConnection({
	host     	: 'localhost',
	port		: 3306,
	user     	: 'Ryan',
	password 	: '$whJk_0Gy7t-',
	database 	: 'Tables'
});

// Sends response to client with success response and optional payload
const endRequestSuccess = (response, payload = null) => {
	console.log('Ending:\t\tSuccess');
	response.json({
		response: 'success',
		payload: payload,
	})
}

// Sends response to client with failure response and message about the failure
const endRequestFailure = (msg, response) => {
	console.log('Ending:\t\tFailure');
	response.json({
		response: 'failure',
		msg: msg,
	})
}

// Log the step currently running in, does not display specific user data
const log = (step) => { 
	console.log(`Running:\t${step}`);
}

exports.endRequestSuccess	= endRequestSuccess;
exports.endRequestFailure	= endRequestFailure;
exports.connect				= connect;
exports.log					= log;