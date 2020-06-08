"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 404ハンドラーミドルウェア
 */
const ttts = require("@tokyotower/domain");
exports.default = (req, __, next) => {
    next(new ttts.factory.errors.NotFound(`router for [${req.originalUrl}]`));
};
