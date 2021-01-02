"use strict";

const fs = require('fs')
const path = require('path')
const moment = require('moment')
const rmdir = require('rimraf')

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
    rmdir(directory, error => {
        if (error) {
            console.error(`Error cleaning up attachments: ${error}`)
        }
    })
}

module.exports = {
    afterDate,
    encodeBase64,
    decodeBase64,
    saveBase64ValueToFileSync,
    removeFilesInDirectory
}