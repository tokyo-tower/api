"use strict";
// import * as fs from 'fs-extra';
const log4js = require("log4js");
/**
 * ベースコントローラー
 */
class BaseController {
    /**
     * constructor
     *
     * @param {string} ログディレクトリ
     */
    constructor(logDir) {
        console.log(logDir);
        // TDOO ログ出力方法考える
        // fs.mkdirsSync(logDir);
        log4js.configure({
            appenders: [
                {
                    category: 'system',
                    type: 'console'
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
    // tslint:disable-next-line:prefer-function-over-method
    shuffle(array) {
        let m = array.length;
        let t;
        let i;
        while (m) {
            m -= 1;
            // tslint:disable-next-line:insecure-random
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
