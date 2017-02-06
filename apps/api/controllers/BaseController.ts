import express = require('express');
import log4js = require('log4js');
import moment = require('moment');

/**
 * ベースコントローラー
 */
export default class BaseController {
    /** httpリクエストオブジェクト */
    public req: express.Request;
    /** httpレスポンスオブジェクト */
    public res: express.Response;
    /** 次に一致するルートメソッド */
    public next: express.NextFunction;
    /** ロガー */
    public logger: log4js.Logger;

    constructor(req: express.Request, res: express.Response, next: express.NextFunction) {
        this.req = req;
        this.res = res;
        this.next = next;

        // URLパラメータで言語管理
        if (this.req.params.locale) {
            this.req.setLocale(req.params.locale);
        }

        this.logger = log4js.getLogger('system');
        this.res.locals.moment = moment;
    }
}
