"use strict";
/**
 * oauthルーター
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
// import * as TTTS from '@motionpicture/ttts-domain';
const createDebug = require("debug");
const express = require("express");
const jwt = require("jsonwebtoken");
const validator_1 = require("../middlewares/validator");
const router = express.Router();
const debug = createDebug('ttts-api:*');
// todo どこで定義するか
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 1800;
router.post('/token', (__1, __2, next) => {
    // req.checkBody('grant_type', 'invalid grant_type').notEmpty().withMessage('assertion is required')
    //     .equals('password');
    // req.checkBody('username', 'invalid username').notEmpty().withMessage('username is required');
    // req.checkBody('password', 'invalid password').notEmpty().withMessage('password is required');
    // req.checkBody('client_id', 'invalid client_id').notEmpty().withMessage('client_id is required');
    // req.checkBody('scope', 'invalid scope').notEmpty().withMessage('scope is required')
    //     .equals('admin');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // client_idの存在確認
        // const numberOfClient = await TTTS.Models.Client.count({ _id: req.body.client_id }).exec();
        // debug('numberOfClient:', numberOfClient);
        // if (numberOfClient === 0) {
        //     throw new Error('client not found');
        // }
        // usernameとpassword照合
        // const owner = await TTTS.Models.Owner.findOne({ username: req.body.username }).exec();
        // if (owner === null) {
        //     throw new Error('owner not found');
        // }
        // if (owner.get('password_hash') !== TTTS.CommonUtil.createHash(req.body.password, owner.get('password_salt'))) {
        //     throw new Error('invalid username or password');
        // }
        // jsonwebtoken生成
        // todo user情報をトークンに含める必要あり
        jwt.sign({
            scope: req.body.scope
        }, process.env.TTTS_API_SECRET, {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS
        }, (err, encoded) => {
            debug(err, encoded);
            if (err instanceof Error) {
                throw err;
            }
            else {
                debug('encoded is', encoded);
                res.json({
                    access_token: encoded,
                    token_type: 'Bearer',
                    expires_in: ACCESS_TOKEN_EXPIRES_IN_SECONDS
                });
            }
        });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = router;
