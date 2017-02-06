"use strict";
const log4js = require("log4js");
const moment = require("moment");
class BaseController {
    constructor(req, res, next) {
        this.req = req;
        this.res = res;
        this.next = next;
        if (this.req.params.locale) {
            this.req.setLocale(req.params.locale);
        }
        this.logger = log4js.getLogger('system');
        this.res.locals.moment = moment;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BaseController;
