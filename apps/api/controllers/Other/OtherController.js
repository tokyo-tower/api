/**
 * その他コントローラー
 *
 * @namespace OtherController
 */
"use strict";
// tslint:disable-next-line:variable-name
function environmentVariables(_req, res) {
    res.json({
        success: true,
        variables: process.env
    });
}
exports.environmentVariables = environmentVariables;
