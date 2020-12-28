"use strict";

const {google} = require('./googleapi')
const gmail = google.gmail('v1')
const glob = require('glob')
const path = require('path')
const _ = require('underscore')

async function start() {
    const labelsMap = await getLabels()
    const emailScripts = getEmailScripts()
    const labelIds = filterLabelsBasedOnEmailScripts(labelsMap, emailScripts)
    
}

// Helpers
async function getLabels() {
    const labels = await gmail.users.labels.list({userId: 'me'})
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

start()