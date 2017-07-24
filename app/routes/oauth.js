"use strict";
/**
 * oAuthルーター
 *
 * @ignore
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
const createDebug = require("debug");
const express = require("express");
const OAuthController = require("../controllers/oAuth");
const validator_1 = require("../middlewares/validator");
const oAuthRouter = express.Router();
const debug = createDebug('ttts-api:routes:oauth');
oAuthRouter.post('/token', (req, __2, next) => {
    req.checkBody('grant_type', 'invalid grant_type')
        .notEmpty().withMessage('assertion is required')
        .equals('client_credentials');
    req.checkBody('scopes', 'invalid scopes').notEmpty().withMessage('scopes is required');
    // 認可タイプによってチェック項目が異なる
    switch (req.body.grant_type) {
        case 'client_credentials':
            req.checkBody('client_id', 'invalid client_id').notEmpty().withMessage('client_id is required');
            req.checkBody('client_secret', 'invalid client_secret').notEmpty().withMessage('client_secret is required');
            req.checkBody('state', 'invalid state').notEmpty().withMessage('state is required');
            break;
        default:
    }
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // 資格情報を発行する
        debug('issueing credentials...');
        const credentials = yield OAuthController.issueCredentials(req);
        res.json(credentials);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = oAuthRouter;
