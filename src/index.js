"use strict";

const config = require('../config/config.secret.json')
const google = require('./googleapi')
const gmail = google.gmail('v1')
const glob = require('glob')
const path = require('path')
const _ = require('underscore')
const { v4: uuidv4 } = require('uuid')
const Utils = require('./utility')
const moment = require('moment')
const MailComposer = require('nodemailer/lib/mail-composer')

const afterDate = Utils.afterDate()
const attachmentFileDirectory = 'attachments'

async function start() {
    await createProcessedLabelIfNeeded()
    const labelsMap = await getLabels()
    const emailScripts = getEmailScripts()
    const customScripts = getCustomScripts()
    const labelIds = filterLabelsBasedOnEmailScripts(labelsMap, emailScripts)
    const messages = await getEmailMessages(labelIds)
    const messageDetails = await getMessageDetails(messages, labelIds, labelsMap[config.email.processedLabelName])
    const parsedData = await parseEmails(messageDetails, emailScripts)
    addCustomScriptsToParsedData(parsedData, customScripts)
    await sendEmail(parsedData)
    await applyProcessedLabelIfNeeded(labelsMap, messages)
    Utils.removeFilesInDirectory(attachmentFileDirectory)
}

//////////// Helpers ////////////
async function createProcessedLabelIfNeeded() {
    if (!config.email.processedLabelName) { return }
    gmail.users.labels.create({
        userId: 'me', 
        requestBody: {
            "name": config.email.processedLabelName,
            "messageListVisibility": "show",
            "labelListVisibility": "labelShow",
            "type": "user",
            "color": {
                "textColor": "#04502e",
                "backgroundColor": "#a2dcc1"
            }
        }
    }, error => {
        if (!error) {
            console.log(`Label "${config.email.processedLabelName}" created`)
        } else if (error.code == 409) {
            // Label already exists - no action needed
        } else {
            console.error(`Error while creating label: ${error}`)
        }
    })
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
    glob.sync('./src/email_scripts/*.js').forEach(file => {
        let emailScripts = require(path.resolve(file))
        scripts.push(emailScripts)
    })
    return scripts
}

function getCustomScripts() {
    let scripts = []
    glob.sync('./src/custom_scripts/*.js').forEach(file => {
        let customScripts = require(path.resolve(file))
        scripts.push(customScripts)
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

async function getEmailMessages(labelIds) {
    const messages = []
    const q = `after:${afterDate.format('YYYY/MM/DD')}`
    for (const labelId of labelIds) {
        const gmailResponse = await gmail.users.messages.list({userId: 'me', labelIds: labelId, q: q})
        if (gmailResponse && gmailResponse.status == 200 && gmailResponse.data && gmailResponse.data.messages) {
            messages.push(...gmailResponse.data.messages)
        }
    }
    return messages
}

/**
 * Retrieves message details and maps them to labelIds.
 * @param {*} messages 
 * @param {*} labelIds 
 * @returns an object that maps labelIds to an array of messageDetails { 'LabelId1': [messageDetail1, messageDetail2]}
 */
async function getMessageDetails(messages, labelIds, processedLabelId) {
    if (!messages) {
        throw('Failed to get email message details')
    }

    let messageDetails = {}
    labelIds = new Set(labelIds)
    for (const message of messages) {
        let messageDetail = await gmail.users.messages.get({userId: 'me', id: message.id})
        if (!messageDetail || messageDetail.status != 200 || !messageDetail.data || !messageDetail.data.payload) {
            continue
        }
        if (processedLabelId && messageDetail.data.labelIds.includes(processedLabelId)) {
            console.warn(`Skipping email id ${messageDetail.data.id} since it has already been processed`)
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
            case 'text/html':
                object.body = rootPart.body.data
                break
            case 'multipart/alternative':
                let innerPart = _.find(rootPart.parts, part => { return part.mimeType === 'text/plain' })
                if (innerPart) {
                    object.body = Utils.decodeBase64(innerPart.body.data)
                }
                break
            case 'application/pdf':
                if (!object.attachments) {
                    object.attachments = []
                }

                const attachment = await gmail.users.messages.attachments.get({userId: 'me', messageId: object.id, id: rootPart.body.attachmentId})
                if (attachment || attachment.status == 200 || attachment.data || attachment.data.data) {
                    let attachmentObject = {
                        id: rootPart.body.attachmentId,
                        base64Value: attachment.data.data,
                        directory: attachmentFileDirectory,
                        fileName: `${uuidv4()}.pdf`,
                    }
                    Utils.saveBase64ValueToFileSync(attachmentObject.base64Value, attachmentObject.directory, attachmentObject.fileName)
                    object.attachments.push(attachmentObject)
                }
                break
            }
        }
        object.payload = messageDetail.data.payload
        messageDetails[object.labelId] = object
    }
    return messageDetails
}

async function parseEmails(messageDetails, emailScripts) {
    let parsedEmails = []
    for (const emailScript of emailScripts) {
        if (!emailScript.labelId) { continue }
        console.log(`Parsing for email script: ${emailScript.displayName}`)
        const messageDetail = messageDetails[emailScript.labelId]
        parsedEmails.push(await emailScript.parse(messageDetail))
    }
    return parsedEmails
}

function addCustomScriptsToParsedData(parsedData, customScripts) {
    for (const customScript of customScripts) {
        console.log(`Parsing for customscript: ${customScript.displayName}`)
        parsedData.push(customScript.parse())
    }
}

async function sendEmail(parsedEmails) {
    let {text, html, attachments} = composeEmail(parsedEmails)

    let mail = new MailComposer({
        from: `${config.email.sender_name} <${config.email.email_address}>`,
        to: config.email.to,
        text: text,
        html: html,
        subject: config.email.subject,
        textEncoding: 'base64',
        attachments: attachments
    })

    const mailBuffer = await mail.compile().build()
    const encodedMail = Utils.encodeBase64(mailBuffer)
    const response = await gmail.users.messages.send({
        userId: 'me',
        resource: {
            raw: encodedMail
        }
    })
    if (response.status != 200) {
        console.error(`Failed to send email. ${response}`)
    }
}

function composeEmail(parsedEmails) {
    const todayDate = moment()
    let attachments = []
    let totalAmount = parseFloat(0)
    let text = `Utility Bill for ${todayDate.format('MMMM YYYY')}`
    let html = `<h2>Utility Bill for ${todayDate.format('MMMM YYYY')}</h2>`
    html += `\n<ul>`

    for (const parsedEmail of parsedEmails) {
        totalAmount += parseFloat(parsedEmail.billAmount)
        text += `\n* ${parsedEmail.billDescription}`
        html += `\n<li>${parsedEmail.billDescription}</li>`
    
        if (parsedEmail.fileData) {
            attachments.push({
                filename: parsedEmail.fileName,
                content: parsedEmail.fileData,
                encoding: 'base64',
            })
        }
    }
    text += `\n\nTotal: $${totalAmount.toFixed(2)}`
    text += '\n------------------------------------------'
    text += `\nThis bill was auto-generated and ran on ${todayDate.format('MM/DD/YYYY')}. `
    text += `It looked for any new bills that came in a month ago after ${afterDate.format('MM/DD/YYYY')}`
    console.log(`\nComposed Email in plain-text: \n${text}`)

    html += `\n</ul>`
    html += `<br/><div>Total: <b>$${totalAmount.toFixed(2)}</b></div>`
    html += '<div>------------------------------------------</div>'
    html += `<div>This bill was auto-generated and ran on ${todayDate.format('MM/DD/YYYY')}. `
    html += `It looked for any new bills that came in a month ago after ${afterDate.format('MM/DD/YYYY')}</div>`
    console.log(`\nComposed Email in HTML: \n${html}`)

    return {
        text,
        html, 
        attachments
    }
}

async function applyProcessedLabelIfNeeded(labelsMap, messageDetails) {
    const labelId = labelsMap[config.email.processedLabelName]
    if (!labelId) { return }

    for (const messageDetail of messageDetails) {
        gmail.users.messages.modify({
            userId: 'me',
            id: messageDetail.id,
            requestBody: {
                addLabelIds: [labelId]
            }
        }, error => {
            if (error) {
                console.error(`Error while adding processed label: ${error}`)
            }
        })
    }
}

var t0 = performance.now()
console.log('Starting...')
await start()
console.log(`Finished - took ${t0-performance.now()} milliseconds.`)