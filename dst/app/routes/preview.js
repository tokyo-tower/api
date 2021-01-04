"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * previewルーター
 */
const cinerinoapi = require("@cinerino/sdk");
const ttts = require("@tokyotower/domain");
const express_1 = require("express");
const NEW_PREVIEW_URL = process.env.NEW_PREVIEW_URL;
const project = {
    typeOf: cinerinoapi.factory.chevre.organizationType.Project,
    id: process.env.PROJECT_ID
};
const previewRouter = express_1.Router();
// 集計データーつきのパフォーマンス検索
previewRouter.get('/performancesWithAggregation', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (typeof NEW_PREVIEW_URL === 'string' && NEW_PREVIEW_URL.length > 0) {
        res.redirect(`${NEW_PREVIEW_URL}/projects/${project.id}${req.originalUrl.replace('/preview', '')}`);
        return;
    }
    next(new ttts.factory.errors.ServiceUnavailable('NEW_PREVIEW_URL undefined'));
}));
// 入場場所検索
previewRouter.get('/places/checkinGate', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (typeof NEW_PREVIEW_URL === 'string' && NEW_PREVIEW_URL.length > 0) {
        res.redirect(`${NEW_PREVIEW_URL}/projects/${project.id}${req.originalUrl.replace('/preview', '')}`);
        return;
    }
    next(new ttts.factory.errors.ServiceUnavailable('NEW_PREVIEW_URL undefined'));
}));
exports.default = previewRouter;
