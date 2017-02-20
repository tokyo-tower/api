/**
 * スクリーンコントローラー
 *
 * @namespace api/ScreenController
 */
"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const fs = require("fs-extra");
/**
 * スクリーンの座席マップを生成する
 *
 * @memberOf api/ScreenController
 */
function show(req, res, next) {
    // スクリーンを取得
    ttts_domain_1.Models.Screen.count({
        _id: req.params.id
    }, (err, count) => {
        if (err) {
            res.send('false');
            return;
        }
        if (count === 0) {
            res.send('false');
            return;
        }
        // スクリーン座席表HTMLを出力
        res.type('txt');
        fs.readFile(`${__dirname}/../../../common/views/screens/${req.params.id}.ejs`, 'utf8', (readFileErr, data) => {
            if (readFileErr)
                return next(readFileErr);
            res.send(data);
        });
    });
}
exports.show = show;
