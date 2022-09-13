// MySQL import
const mysql = require('mysql');
// Environment Variables
require('dotenv').config();

// Connection information - Change here when Server changes
const connect = mysql.createConnection({
	host     : process.env.host,
	user     : process.env.user,
	password : process.env.password,
	database : process.env.database
});

// Sends response to client with success response and optional payload
const endRequestSuccess = (response, payload = null) => {
	console.log('Ending Success');
	response.json({
		response: 'success',
		payload: payload,
	})
}

// Sends response to client with failure response and message about the failure
const endRequestFailure = (msg, response) => {
	console.log('Ending Failure');
	response.json({
		response: 'failure',
		msg: msg,
	})
}

exports.endRequestSuccess = endRequestSuccess;
exports.endRequestFailure = endRequestFailure;
exports.connect = connect;