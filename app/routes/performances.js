"use strict";
/**
 * パフォーマンスルーター
 *
 * @module routes/performances
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const performanceRouter = express.Router();
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const setLocale_1 = require("../middlewares/setLocale");
const PerformanceController = require("../controllers/performance");
performanceRouter.use(authentication_1.default);
/**
 * パフォーマンス検索
 */
performanceRouter.get('', permitScopes_1.default(['performances', 'performances.read-only']), setLocale_1.default, PerformanceController.search);
exports.default = performanceRouter;
