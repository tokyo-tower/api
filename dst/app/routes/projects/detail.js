"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * プロジェクト詳細ルーター
 */
const ttts = require("@tokyotower/domain");
const express = require("express");
const aggregateSales_1 = require("../aggregateSales");
const performances_1 = require("../performances");
const projectDetailRouter = express.Router();
projectDetailRouter.use((req, _, next) => {
    var _a;
    // プロジェクト未指定は拒否
    if (typeof ((_a = req.project) === null || _a === void 0 ? void 0 : _a.id) !== 'string') {
        next(new ttts.factory.errors.Forbidden('project not specified'));
        return;
    }
    next();
});
projectDetailRouter.use('/aggregateSales', aggregateSales_1.default);
projectDetailRouter.use('/performances', performances_1.default);
exports.default = projectDetailRouter;
