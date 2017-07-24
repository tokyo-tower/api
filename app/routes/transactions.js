"use strict";
/**
 * 取引ルーター
 *
 * @module routes/transactions
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const transactionRouter = express.Router();
const TransactionController = require("../controllers/transaction");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const setLocale_1 = require("../middlewares/setLocale");
const validator_1 = require("../middlewares/validator");
transactionRouter.use(authentication_1.default);
transactionRouter.post('/authorizations', permitScopes_1.default(['transactions.authorizations']), setLocale_1.default, (__1, __2, next) => {
    next();
}, validator_1.default, TransactionController.createAuthorization);
transactionRouter.delete('/authorizations/:id', permitScopes_1.default(['transactions.authorizations']), setLocale_1.default, (__1, __2, next) => {
    next();
}, validator_1.default, TransactionController.deleteAuthorization);
transactionRouter.post('/confirm', permitScopes_1.default(['transactions']), setLocale_1.default, (__1, __2, next) => {
    next();
}, validator_1.default, TransactionController.confirm);
transactionRouter.post('/cancel', permitScopes_1.default(['transactions']), setLocale_1.default, (__1, __2, next) => {
    next();
}, validator_1.default, TransactionController.cancel);
exports.default = transactionRouter;
