"use strict";
/**
 * 言語設定ミドルウェア
 *
 * @module setLocaleMiddleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
const createDebug = require("debug");
const debug = createDebug('ttts-api:middleware:setLocale');
// tslint:disable-next-line:variable-name
exports.default = (req, _res, next) => {
    // todo URLパラメータで言語管理
    if (req.params.locale !== undefined) {
        debug('setting locale...', req.params.locale);
        req.setLocale(req.params.locale);
    }
    next();
};
