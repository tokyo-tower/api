"use strict";
/**
 * 404ハンドラーミドルウェア
 * @module middlewares.notFoundHandler
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ttts = require("@motionpicture/ttts-domain");
exports.default = (req, __, next) => {
    next(new ttts.factory.errors.NotFound(`router for [${req.originalUrl}]`));
};
