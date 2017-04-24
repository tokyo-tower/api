"use strict";
/**
 * 認証コントローラー
 *
 * @namespace AuthController
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
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const crypto = require("crypto");
/**
 * ログイン
 *
 * @memberOf AuthController
 */
function login(_, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const SIZE = 64;
        const token = crypto.randomBytes(SIZE).toString('hex');
        try {
            const authentication = yield chevre_domain_1.Models.Authentication.findOneAndUpdate({
                mvtk_kiin_cd: '00000775' // テスト用会員コード
            }, {
                token: token
            }, {
                upsert: true,
                new: true
            }).exec();
            res.json({
                success: true,
                access_token: authentication.get('token'),
                mvtk_kiin_cd: authentication.get('mvtk_kiin_cd') // テスト用会員コード
            });
        }
        catch (error) {
            res.json({
                success: false,
                access_token: null,
                mvtk_kiin_cd: null
            });
        }
    });
}
exports.login = login;
