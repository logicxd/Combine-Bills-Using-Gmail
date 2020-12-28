"use strict";

const moment = require('moment');

/**
 * JavaScript doesn't support interfaces so sub-classing is used in place.
 * All email scripts must subclass this class.
 */
const baseEmailScript = {
    /**
     * LabelName of the emails to check.
     */
    labelName: null,
    /**
     * Given the email object
     * Should sets `price`
     */
    parseEmail: function() {
        throw 'Subclass must implement parseEmail(email)'
        this.price = 0
    },
    /**
     * Total price of bill
     */
    price: function() {
        throw 'Subclass must implement price()'
        return this.price
    },
    /**
     * Date to start reading emails. By default, this returns a month and a day ago.
     */
    fromDate: function() {
        return moment.utc().subtract(1, 'months').subtract(1, 'days')
    }
}

module.exports = baseEmailScript