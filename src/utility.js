"use strict";

const fs = require('fs')
const path = require('path')
const moment = require('moment')
const winston = require('winston');
const { createLogger, transports, format } = require('winston');

// Logs
const logger = winston.createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    transports: [
        new transports.File({ filename: './output-combined.log' }),
        new transports.File({ filename: './output-error.log', level: 'error' }),
    ]
})

// if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.combine(
          format.colorize(),
          format.simple()
        )
    }));    
// }

// End logs 

/**
 * @returns current date minus 1 month and 1 day. The 1 extra day is just to make sure we don't miss anything.
 */
function afterDate() {
    return moment.utc().subtract(1, 'months').subtract(1, 'days')
}

/**
 * Encodes to base64 value for email attachments
 * @param {*} text plain text
 */
function encodeBase64(text) {
    return Buffer.from(text).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

/**
 * Decodes base64 value for email attachments
 * @param {*} base64 encoded string
 */
function decodeBase64(base64) {
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(base64, 'base64').toString()
}

/**
 * Creates directory if needed and creates the file to that directory
 * @param {*} base64 encoded string
 * @param {*} directory directory path
 * @param {*} fileName file name
 */
function saveBase64ValueToFileSync(base64, directory, fileName) {
    const buffer = Buffer.from(base64, 'base64')
    fs.mkdirSync(directory, { recursive: true })
    fs.writeFileSync(path.join(directory, fileName), buffer)
}

function removeFilesInDirectory(directory) {
    fs.rmdirSync(directory, { recursive: true })
}

module.exports = {
    logger,
    afterDate,
    encodeBase64,
    decodeBase64,
    saveBase64ValueToFileSync,
    removeFilesInDirectory
}