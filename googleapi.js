"use strict";

const {google} = require('googleapis');
const config = require('./config/config.development.json')

function authenticateWithExistingRefreshToken() {
    const oauth2Client = new google.auth.OAuth2(
        config.client_id,
        config.client_secret,
        null
    )
    oauth2Client.setCredentials({
        refresh_token: config.refresh_token
    })
    
    google.options({
        auth: oauth2Client
    })
}

authenticateWithExistingRefreshToken()
module.exports = google