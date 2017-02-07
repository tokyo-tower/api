"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (req, _res, next) => {
    if (req.params.locale) {
        req.setLocale(req.params.locale);
    }
    next();
};
