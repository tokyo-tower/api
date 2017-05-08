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
const createDebug = require("debug");
const express = require("express");
const jwt = require("jsonwebtoken");
const validator_1 = require("../middlewares/validator");
const router = express.Router();
const debug = createDebug('chevre-api:*');
// todo どこで定義するか
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 1800;
router.all('/token', (__1, __2, next) => {
    // req.checkBody('assertion', 'invalid assertion').notEmpty().withMessage('assertion is required')
    //     .equals(process.env.SSKTS_API_REFRESH_TOKEN);
    // req.checkBody('scope', 'invalid scope').notEmpty().withMessage('scope is required')
    //     .equals('admin');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        jwt.sign({
            scopes: req.body.scopes
        }, process.env.CHEVRE_API_SECRET, {
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
