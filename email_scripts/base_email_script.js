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
     * Should return an object with related details
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