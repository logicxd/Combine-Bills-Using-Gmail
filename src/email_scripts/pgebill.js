"use strict";

const fs = require('fs');
const path = require('path')
const Utils = require('../utility')

const baseEmailScript = require("./base_email_script");
const pgeBill = Object.create(baseEmailScript)
pgeBill.displayName = 'PG&E'
pgeBill.labelName = 'Automated/MitchellPlace/PGnE'
pgeBill.parseEmail = async function(messageDetail) {
    if (!messageDetail) {
        return {success: false}
    }

    const attachment = messageDetail.attachments.length > 0 ? messageDetail.attachments[0] : null
    let isTotalAmountDueTextFound = false
    let text = Utils.decodeBase64(messageDetail.body)
    let split = text.split('The amount of $')
    let textContainingTheAmount = split.length == 2 ? split[1] : null
    let splitbySpace = textContainingTheAmount.split(' ')
    let billAmount = splitbySpace.length > 0 ? splitbySpace[0] : null

    if (billAmount) {
        return {
            success: billAmount,
            billAmount: parseFloat(billAmount),
            billDescription: `PG&E Electricity and Gas: $${billAmount} (PDF password: PdgriSkgoU8MQ6Aj)`,
            fileName: attachment ? `PG&E_${attachment.fileName}` : null,
            fileData: attachment ? attachment.base64Value : null
        }
    } else {
        return {success: false}
    }
}
module.exports = pgeBill