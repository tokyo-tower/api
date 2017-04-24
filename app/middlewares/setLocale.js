"use strict";
/**
 * 言語設定ミドルウェア
 *
 * @module setLocaleMiddleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable-next-line:variable-name
exports.default = (req, _res, next) => {
    // todo URLパラメータで言語管理
    if (req.params.locale !== undefined) {
        req.setLocale(req.params.locale);
    }
    next();
};
