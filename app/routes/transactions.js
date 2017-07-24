"use strict";
/**
 * 取引ルーター
 *
 * @module routes/transactions
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const transactionRouter = express.Router();
const authentication_1 = require("../middlewares/authentication");
transactionRouter.use(authentication_1.default);
exports.default = transactionRouter;
