"use strict";
/**
 * 管理者ルーター
 * @namespace routes.admins
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
const express_1 = require("express");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const adminsRouter = express_1.Router();
adminsRouter.use(authentication_1.default);
/**
 * ログイン中の管理者ユーザー情報を取得する
 */
adminsRouter.get('/me', permitScopes_1.default(['aws.cognito.signin.user.admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const admin = yield ttts.service.admin.getUserByAccessToken(req.accessToken)();
        res.json(admin);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * ログイン中の管理者ユーザーのグループリストを取得する
 */
adminsRouter.get('/me/groups', permitScopes_1.default(['aws.cognito.signin.user.admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const admin = yield ttts.service.admin.getGroupsByUsername(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY, process.env.ADMINS_USER_POOL_ID, req.user.username)();
        res.json(admin);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 管理者リストを取得する
 */
adminsRouter.get('', permitScopes_1.default(['aws.cognito.signin.user.admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        let admins;
        if (typeof req.query.group === 'string') {
            admins = yield ttts.service.admin.findAllByGroup(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY, process.env.ADMINS_USER_POOL_ID, req.query.group)();
        }
        else {
            admins = yield ttts.service.admin.findAll(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY, process.env.ADMINS_USER_POOL_ID)();
        }
        res.json(admins);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = adminsRouter;
