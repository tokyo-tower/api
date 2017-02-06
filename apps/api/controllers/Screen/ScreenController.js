"use strict";
const BaseController_1 = require("../BaseController");
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const fs = require("fs-extra");
class ScreenController extends BaseController_1.default {
    show() {
        ttts_domain_1.Models.Screen.count({
            _id: this.req.params.id
        }, (err, count) => {
            if (err) {
                this.res.send('false');
                return;
            }
            if (count === 0) {
                this.res.send('false');
                return;
            }
            this.res.type('txt');
            fs.readFile(`${__dirname}/../../../common/views/screens/${this.req.params.id}.ejs`, 'utf8', (err, data) => {
                if (err)
                    return this.next(err);
                this.res.send(data);
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ScreenController;
