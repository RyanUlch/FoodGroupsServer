// Table of Contents:
	// line 15		- N/A			- Multer Setup
	// line 23		- /uploadForm	- Upload Image
	// line 48		- /download		- Download Image

/* Express/FileSystem(FS)/Multer/Path/Helper Imports */
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const server = require('../helpers/server');
/* Get Router info from express */
const router = express.Router();

/* Multer Setup */ /* Multer Setup */ /* Multer Setup */ /* Multer Setup */ /* Multer Setup */
// Storage information for Multer 
let storage = multer.diskStorage({ destination: (req, file, cb) => { cb(null, './public/uploads/'); }, filename: (req, file, cb) => { cb(null, file.originalname);}});

// Filters files that are not 'jpeg, jpg or png'
const fileFilter = (req, file, cb) => {(file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') ?  cb(null, true) : cb(null, false);}

// Creates upload variable to store images
let upload = multer({ storage: storage,	fileFilter: fileFilter });

/* Upload Image */ /* Upload Image */ /* Upload Image */ /* Upload Image */ /* Upload Image */ /* Upload Image */
/* Upload image from client */

// Order of queries/functions:
	// 0. STARTPOINT		- Setup connection/response
	// 1. FILEPATH			- Creates filepath for new image
	// 2. ENDPOINT			- Send client success response

// Known issues:
	// There is currently nothing limiting the size of files
	// Suggested Fix:
		// - Do that thing, especially if website goes beyond family/portfolio piece

// 0. STARTPOINT
router.post('/upload', upload.single('file'), (request, response) => {
	if (request.file) {
		// 1. FILEPATH
		const pathName = request.file.path;

		// 2. ENDPOINT
		server.endRequestSuccess(response);
	};
});

/* Download Image */ /* Download Image */ /* Download Image */ /* Download Image */ /* Download Image */ /* Download Image */ 
/* Let Client Download images */

// Order of queries/functions:
	// 0. STARTPOINT		- Setup connection/response
	// 1. RESOLVE			- Resolve relative path for FS
		// 1.1 FAILOUT		- There is no image with that filename
	// 2. ENDPOINT			- Send client success response with file

// Known issues:
	// - None

// 0. STARTPOINT
router.get('/download/:imageurl', (request, response) => {
	// 1. RESOLVE
	const imageURL = path.resolve(`./public/uploads/${request.params.imageurl}`);
	if (fs.existsSync(imageURL)) {
		// 2. ENDPOINT
		response.sendFile(imageURL)
	} else {
		// 1.1 FAILOUT
		server.endRequestFailure('No image with that filename on server', response);
	}
})

module.exports = router;