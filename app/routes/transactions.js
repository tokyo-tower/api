"use strict";
/**
 * 取引ルーター
 *
 * @module routes/transactions
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const httpStatus = require("http-status");
const transactionRouter = express.Router();
const TransactionController = require("../controllers/transaction");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const setLocale_1 = require("../middlewares/setLocale");
const validator_1 = require("../middlewares/validator");
transactionRouter.use(authentication_1.default);
/**
 * 座席仮予約
 */
transactionRouter.post('/authorizations', permitScopes_1.default(['transactions.authorizations']), setLocale_1.default, (req, __2, next) => {
    req.checkBody('performance').notEmpty().withMessage('performance is required');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield TransactionController.createAuthorization(req.body.performance)
            .then((option) => {
            option.match({
                Some: (authorization) => {
                    res.status(httpStatus.OK).json({
                        data: authorization
                    });
                },
                None: () => {
                    // 空席がなければ404
                    res.status(httpStatus.NOT_FOUND).json({
                        data: null
                    });
                }
            });
        });
    }
    catch (error) {
        next(error);
    }
}));
transactionRouter.delete('/authorizations/:id', permitScopes_1.default(['transactions.authorizations']), setLocale_1.default, (__1, __2, next) => {
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield TransactionController.deleteAuthorization(req.params.id)
            .then((option) => {
            option.match({
                Some: () => {
                    res.status(httpStatus.NO_CONTENT).end();
                },
                None: () => {
                    // 該当予約がなければ404
                    res.status(httpStatus.NOT_FOUND).json({
                        data: null
                    });
                }
            });
        });
    }
    catch (error) {
        next(error);
    }
}));
transactionRouter.post('/confirm', permitScopes_1.default(['transactions']), setLocale_1.default, (__1, __2, next) => {
    next();
}, validator_1.default, (__, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield TransactionController.confirm();
        res.status(httpStatus.OK).json({
            data: {}
        });
    }
    catch (error) {
        next(error);
    }
}));
transactionRouter.post('/cancel', permitScopes_1.default(['transactions']), setLocale_1.default, (__1, __2, next) => {
    next();
}, validator_1.default, (__, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield TransactionController.cancel();
        res.status(httpStatus.OK).json({
            data: {}
        });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = transactionRouter;
