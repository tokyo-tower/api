"use strict";
function environmentVariables(_req, res) {
    res.json({
        success: true,
        variables: process.env
    });
}
exports.environmentVariables = environmentVariables;
