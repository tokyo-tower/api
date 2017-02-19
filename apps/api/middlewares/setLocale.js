/**
 * 言語設定ミドルウェア
 *
 * @module setLocaleMiddleware
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable-next-line:variable-name
exports.default = (req, _res, next) => {
    // todo URLパラメータで言語管理
    if (req.params.locale) {
        req.setLocale(req.params.locale);
    }
    next();
};
