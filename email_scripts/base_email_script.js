"use strict";

/**
 * JavaScript doesn't support interfaces so sub-classing is used in place.
 * All email scripts must subclass this class.
 */
const baseEmailScript = {
    /**
     * Display name to be used in composing the email
     */
    displayName: null,
    /**
     * LabelName of the emails to check.
     */
    labelName: null,
    /**
     * LabelId that will be fetched dynamically from API results
     */
    labelId: null,
    /**
     * Given the email object
     * Should return an object with properties: 
     *   success - boolean that indicates whether or not it parsed successfully.
     *   billAmount - float amount of the bill. Use parseFloat(amount) to get the float value.
     *   billDescription - the text that will be displayed on the body of the email. Include the bill amount here.
     *   fileName - optional if there is an attachment. This will be used as the file name of the attachment in the email.
     *   fileData - optional if there is an attachment. This should be the base64Value of the file.
     * Example: 
     let parsedObject = {
        success: true,
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
    // /**
    //  * Total price of bill
    //  */
    // price: function() {
    //     throw 'Subclass must implement price()'
    //     return this.price
    // }
}

module.exports = baseEmailScript