"use strict";
const log4js = require("log4js");
class BaseController {
    constructor(logDir) {
        console.log(logDir);
        log4js.configure({
            appenders: [
                {
                    category: 'system',
                    type: 'console',
                },
                {
                    type: 'console'
                }
            ],
            levels: {
                system: 'ALL'
            },
            replaceConsole: true
        });
        this.logger = log4js.getLogger('system');
    }
    shuffle(array) {
        let m = array.length, t, i;
        while (m) {
            m--;
            i = Math.floor(Math.random() * m);
            t = array[m];
            array[m] = array[i];
            array[i] = t;
        }
        return array;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BaseController;
