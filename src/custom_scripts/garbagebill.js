"use strict";

const baseScript = require("../base_script");
const garbageBill = Object.create(baseScript)
garbageBill.displayName = 'Garbage'
garbageBill.labelName = 'Automated/HomeBill/Garbage'
garbageBill.parse = function() {
    const constantGarbageBillAmount = parseFloat(35)
    return {
        billAmount: constantGarbageBillAmount,
        billDescription: `Garbage: $${constantGarbageBillAmount} (fixed monthly)`
    }
}
module.exports = garbageBill