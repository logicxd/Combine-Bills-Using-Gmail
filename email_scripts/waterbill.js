"use strict";

const baseEmailScript = require("./base_email_script");
const waterBill = Object.create(baseEmailScript)
waterBill.displayName = 'Water'
waterBill.labelName = 'Automated/MitchellPlace/Water'

module.exports = waterBill