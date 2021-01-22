"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ルーティング
 */
const express_1 = require("express");
const health_1 = require("./health");
const preview_1 = require("./preview");
const detail_1 = require("./projects/detail");
const stats_1 = require("./stats");
const webhooks_1 = require("./webhooks");
const authentication_1 = require("../middlewares/authentication");
const rateLimit_1 = require("../middlewares/rateLimit");
const setProject_1 = require("../middlewares/setProject");
const router = express_1.Router();
// 認証不要なルーター
router.use('/health', health_1.default);
router.use('/preview', preview_1.default);
router.use('/stats', stats_1.default);
router.use('/webhooks', webhooks_1.default);
// リクエストプロジェクト設定
router.use(setProject_1.default);
// 認証
router.use(authentication_1.default);
// レート制限
router.use(rateLimit_1.default);
// 要認証なルーター↓
// 以下、プロジェクト指定済の状態でルーティング
router.use('/projects/:id', detail_1.default);
exports.default = router;
