"use strict";

const fs = require('fs');
const path = require('path')
const pdf = require('pdf-parse');

const baseEmailScript = require("./base_email_script");
const waterBill = Object.create(baseEmailScript)
waterBill.displayName = 'Water'
waterBill.labelName = 'Automated/MitchellPlace/Water'
waterBill.parseEmail = async function(messageDetail) {
    console.log('Parsing Water Bill...')
    if (!messageDetail || !messageDetail.attachments || messageDetail.attachments.length < 1) {
        console.warn('PDF attachments not found. Water bill cannot be retrieved.')
        return {success: false}
    }

    const attachment = messageDetail.attachments[0]
    const buffer = fs.readFileSync(path.join(attachment.directory, attachment.fileName))
    const parsedData = await pdf(buffer);
    const lineSeparatedArray = parsedData.text.split('\n')

    let isTotalAmountDueTextFound = false
    let billAmount = 0
    for (const text of lineSeparatedArray) {
        if (isTotalAmountDueTextFound && text.includes('$')) {
            billAmount = text.split('$')[1]
            break
        } else if (text === 'Total Amount Due') {
            isTotalAmountDueTextFound = true
        }
    }

    let parsedObject = {
        success: isTotalAmountDueTextFound,
        billAmount,
        billDescription: `Water: $${billAmount}`
    }
    console.log(`  ${parsedObject.billDescription}`)
    return parsedObject
}
module.exports = waterBill