"use strict";

const google = require('./googleapi')
const gmail = google.gmail('v1')
const glob = require('glob')
const path = require('path')
const _ = require('underscore')
const { v4: uuidv4 } = require('uuid');
const Utils = require('./utility')

async function start() {
    const labelsMap = await getLabels()
    const emailScripts = getEmailScripts()
    const labelIds = filterLabelsBasedOnEmailScripts(labelsMap, emailScripts)
    const messages = await gmail.users.messages.list({userId: 'me', labelIds: labelIds, q: `after:${Utils.afterDate()}`})
    const messageDetails = await getMessageDetails(messages, labelIds)
    await parseEmails(messageDetails, emailScripts)
}

//////////// Helpers ////////////
async function parseEmails(messageDetails, emailScripts) {
    for (const [key, value] of Object.entries(messageDetails)) {
        let emailScript = _.find(emailScripts, script => { return script.labelId === key })
        await emailScript.parseEmail(value)
    }
}

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
            const labelId = labelsMap[labelName]
            script.labelId = labelId
            labelIds.push(labelId)
        }
    })
    return labelIds
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
            switch(rootPart.mimeType) {
            case 'multipart/alternative':
                let innerPart = _.find(rootPart.parts, part => { return part.mimeType === 'text/plain' })
                if (innerPart) {
                    object.body = Utils.decodeBase64(innerPart.body.data)
                }
                break; 
            case 'application/pdf':
                if (!object.attachments) {
                    object.attachments = []
                }

                const attachment = await gmail.users.messages.attachments.get({userId: 'me', messageId: object.id, id: rootPart.body.attachmentId})
                if (attachment || attachment.status == 200 || attachment.data || attachment.data.data) {
                    let attachmentObject = {
                        id: rootPart.body.attachmentId,
                        base64Value: attachment.data.data,
                        directory: 'attachments',
                        fileName: `${uuidv4()}.pdf`,
                    }
                    Utils.saveBase64ValueToFileSync(attachmentObject.base64Value, attachmentObject.directory, attachmentObject.fileName)
                    object.attachments.push(attachmentObject)
                }
                break; 
            }
        }
        messageDetails[object.labelId] = object
    }
    return messageDetails
}

start()