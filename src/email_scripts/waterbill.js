"use strict";

const fs = require('fs');
const path = require('path')
const pdf = require('pdf-parse');
const Utils = require('../utility')

const baseScript = require("../base_script");
const waterBill = Object.create(baseScript)
waterBill.displayName = 'Water'
waterBill.labelName = 'Automated/HomeBill/Water'
waterBill.parse = async function(messageDetail) {
    let parsedObject = {
        billAmount: parseFloat(0),
        billDescription: `Water: $0 (billed once every 2 months)`
    }

    if (!messageDetail) {
        Utils.logger.warn('No water bill found this month.')
        return parsedObject
    }
    if (!messageDetail.attachments || messageDetail.attachments.length < 1) {
        Utils.logger.warn('PDF attachments not found. Water bill cannot be retrieved.')
        return parsedObject
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

    if (isTotalAmountDueTextFound) {
        parsedObject = {
            billAmount: parseFloat(billAmount),
            billDescription: `Water: $${billAmount} (billed once every 2 months)`,
            fileName: `Water_${attachment.fileName}`,
            fileData: attachment.base64Value
        }
    }
    return parsedObject
}
module.exports = waterBill