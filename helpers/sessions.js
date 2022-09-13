// MD5 Import
const md5 = require('md5');

// Generate an token to create session tokens
const generate = (id) => {
	console.log(id);
    return `a${md5(Math.random())}mr${md5(Math.random())}w${md5(id)}`; // remove `0.`
}

// Validate provided token came from generator
	// Note: Due to the constant character literals, it is possible to create a fake token that passes the validation,
	// however, as token is always compared to a server copy, and the pseudorandom generation; Bad User could only spoof
	// legit user if they got the users token which is stored in sessionStorage and is not as accessible
const validate = (token) => {
	if (token[0] === 'a' && token[33] === 'm' && token[34] === 'r' && token[67] === 'w') {
		return true;
	} else {
		return false;
	}
}

exports.generate = generate;
exports.validate = validate;