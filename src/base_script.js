"use strict";

/**
 * JavaScript doesn't support interfaces so sub-classing is used in place.
 * All scripts must subclass this class.
 */
const baseScript = {
    /** Your custom email scripts should set these properties below */

    /**
     * Display name to be used in composing the email
     */
    displayName: null,
    /**
     * LabelName of the emails to check.
     */
    labelName: null,
    /**
     * Given the email object
     * Should return an object with properties: 
     *   billAmount - float amount of the bill. Use parseFloat(amount) to get the float value.
     *   billDescription - the text that will be displayed on the body of the email. Include the bill amount here.
     *   fileName - optional if there is an attachment. This will be used as the file name of the attachment in the email.
     *   fileData - optional if there is an attachment. This should be the base64Value of the file.
     * Example: 
     let parsedObject = {
        billAmount: 51.12,
        billDescription: 'Water: $51.12 (billed once every 2 months)',
        fileName: 'Water_Bill.pdf',
        fileData: '<base64Value of the file>'
    }
     */
    parseEmail: async function(messageDetail) {
        throw 'Subclass must implement parseEmail(email)'
        this.price = 0
    },

    /** Other properties that will be set on this object automatically*/

    /**
     * (DON'T SET THIS) labelId will be fetched dynamically from API results in index.js filterLabelsBasedOnEmailScripts
     */
    labelId: null,
}

module.exports = baseScript