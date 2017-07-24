"use strict";
/**
 * デフォルトルーター
 *
 * @module routes/router
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const router = express.Router();
const authentication_1 = require("../middlewares/authentication");
router.use(authentication_1.default);
exports.default = router;
