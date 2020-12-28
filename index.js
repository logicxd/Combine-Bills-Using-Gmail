"use strict";

const {google} = require('./googleapi')
const gmail = google.gmail('v1')
const glob = require('glob')
const path = require('path')
const _ = require('underscore')
const moment = require('moment')
const fs = require('fs')

async function start() {
    try {
        const labelsMap = await getLabels()
        const emailScripts = getEmailScripts()
        const labelIds = filterLabelsBasedOnEmailScripts(labelsMap, emailScripts)
        const messages = await gmail.users.messages.list({userId: 'me', labelIds: labelIds, q: `after:${afterDate()}`})
        const messageDetails = await getMessageDetails(messages, labelIds)
        console.log(messageDetails)
    } catch (error) {
        console.error(`Error: ${error}`)
    }
}

// Helpers
async function getLabels() {
    const labels = await gmail.users.labels.list({userId: 'me'})

    if (!labels || labels.status != 200 || !labels.data || !labels.data.labels) {
        throw('Failed to list labels')
    }

    const labelsMap = labels.data.labels.reduce((dict, label) => {
        let name = label['name']
        let id = label['id']
        dict[name] = id
        return dict
    }, {})
    return labelsMap
}

function getEmailScripts() {
    let scripts = []
    glob.sync('./email_scripts/*.js').forEach(file => {
        let emailScripts = require(path.resolve(file))
        scripts.push(emailScripts)
    })
    return scripts
}

function filterLabelsBasedOnEmailScripts(labelsMap, emailScripts) {
    const labelIds = []
    emailScripts.forEach(script => {
        const labelName = script.labelName
        if (labelName != null && labelsMap[labelName]) {
            labelIds.push(labelsMap[labelName])
        }
    })
    return labelIds
}

/**
 * @returns current date minus 1 month and 1 day. The 1 extra day is just to make sure we don't miss anything.
 */
function afterDate() {
    return moment.utc().subtract(1, 'months').subtract(1, 'days').format('YYYY/MM/DD')
}

/**
 * Retrieves message details and maps them to labelIds.
 * @param {*} messages 
 * @param {*} labelIds 
 * @returns an object that maps labelIds to an array of messageDetails { 'LabelId1': [messageDetail1, messageDetail2]}
 */
async function getMessageDetails(messages, labelIds) {
    if (!messages || messages.status != 200 || !messages.data || !messages.data.messages) {
        throw('Failed to get email message details')
    }

    let messageDetails = {}
    labelIds = new Set(labelIds)
    for (const message of messages.data.messages) {
        let messageDetail = await gmail.users.messages.get({userId: 'me', id: message.id})
        if (!messageDetail || messageDetail.status != 200 || !messageDetail.data || !messageDetail.data.payload) {
            continue
        }

        const object = {
            'id': messageDetail.data.id
        }
        for (const labelId of messageDetail.data.labelIds) {
            if (labelIds.has(labelId)) {
                object.labelId = labelId
                break
            }
        }
        for (const rootPart of messageDetail.data.payload.parts) {
            console.log(rootPart)
            switch(rootPart.mimeType) {
            case 'multipart/alternative':
                let innerPart = _.find(rootPart.parts, part => { return part.mimeType === 'text/plain' })
                if (innerPart) {
                    object.body = decodeBase64(innerPart.body.data)
                }
                break; 
            case 'application/pdf':
                object.attachmentId = rootPart.body.attachmentId
                break; 
            }
        }
        if (object.attachmentId) {
            const attachment = await gmail.users.messages.attachments.get({userId: 'me', messageId: object.id, id: object.attachmentId})
            if (attachment || attachment.status == 200 || attachment.data || attachment.data.data) {
                object.attachmentBase64 = attachment.data.data
            }
        }
        console.log(object)
        messageDetails[object.labelId] = object
    }
    return messageDetails
}

function decodeBase64(base64) {
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(base64, 'base64').toString()
}

function saveBase64ValueToFileSync(base64, fileName) {
    const buffer = Buffer.from(base64, 'base64')
    fs.writeFileSync(fileName, buffer, error => {
        if (error) {
            throw(error)
        }
    })
}

start()