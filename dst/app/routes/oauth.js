"use strict";
/**
 * oauthルーター
 * @namespace routes.oauth
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
const ttts = require("@motionpicture/ttts-domain");
const basicAuth = require("basic-auth");
const createDebug = require("debug");
const express_1 = require("express");
const validator_1 = require("../middlewares/validator");
const debug = createDebug('ttts-api:routes:oauth');
const oauthRouter = express_1.Router();
oauthRouter.post('/token', (req, __, next) => {
    req.checkBody('username', 'invalid username')
        .notEmpty()
        .withMessage('username is required');
    req.checkBody('password', 'invalid password')
        .notEmpty()
        .withMessage('password is required');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // ベーシック認証ユーザーがクライアント情報
        const user = basicAuth(req);
        debug('basic auth user:', user);
        if (user === undefined) {
            throw new ttts.factory.errors.Unauthorized();
        }
        const credentials = yield ttts.service.admin.login(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY, user.name, user.pass, process.env.ADMINS_USER_POOL_ID, req.body.username, req.body.password)();
        res.json(credentials);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = oauthRouter;
