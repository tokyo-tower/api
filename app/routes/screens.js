"use strict";
/**
 * スクリーンルーター
 *
 * @module routes/screens
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const screenRouter = express.Router();
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const ScreenController = require("../controllers/screen");
screenRouter.use(authentication_1.default);
/**
 * スクリーンHTMLを取得する
 */
screenRouter.get('/:id/show', permitScopes_1.default(['screens', 'screens.read-only']), (__1, __2, next) => {
    next();
}, validator_1.default, ScreenController.show);
exports.default = screenRouter;
