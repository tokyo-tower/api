"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const fs = require("fs-extra");
function show(req, res, next) {
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
        res.type('txt');
        fs.readFile(`${__dirname}/../../../common/views/screens/${req.params.id}.ejs`, 'utf8', (err, data) => {
            if (err)
                return next(err);
            res.send(data);
        });
    });
}
exports.show = show;
