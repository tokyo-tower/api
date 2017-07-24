"use strict";
/**
 * oAuthコントローラー
 *
 * @namespace controllers/oAuth
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
const bcrypt = require("bcryptjs");
const createDebug = require("debug");
const jwt = require("jsonwebtoken");
const debug = createDebug('ttts-api:controllers:oAuth');
// todo どこで定義するか
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 1800;
exports.MESSAGE_UNIMPLEMENTED_GRANT_TYPE = 'grant_type not implemented';
exports.MESSAGE_INVALID_CLIENT_CREDENTIALS = 'invalid client id or secret';
/**
 * 資格情報を発行する
 *
 * @param {Request} req リクエストオブジェクト
 * @returns {Promise<ICredentials>} 資格情報
 */
function issueCredentials(req) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (req.body.grant_type) {
            case 'client_credentials':
                return yield issueCredentialsByClient(req.body.client_id, req.body.client_secret, req.body.state, req.body.scopes);
            default:
                // 非対応認可タイプ
                throw new Error(exports.MESSAGE_UNIMPLEMENTED_GRANT_TYPE);
        }
    });
}
exports.issueCredentials = issueCredentials;
/**
 * クライアントIDから資格情報を発行する
 *
 * @param {string} clientId クライアントID
 * @param {string[]} scopes スコープリスト
 * @returns {Promise<ICredentials>} 資格情報
 */
function issueCredentialsByClient(clientId, clientSecret, state, scopes) {
    return __awaiter(this, void 0, void 0, function* () {
        // クライアントの存在確認
        const clientDoc = yield ttts.Models.Client.findById(clientId).exec();
        if (clientDoc === null) {
            throw new Error(exports.MESSAGE_INVALID_CLIENT_CREDENTIALS);
        }
        // クライアントシークレット確認
        debug('comparing secret...');
        if (!(yield bcrypt.compare(clientSecret, clientDoc.get('secret_hash')))) {
            throw new Error(exports.MESSAGE_INVALID_CLIENT_CREDENTIALS);
        }
        return yield payload2credentials({
            client: clientId,
            state: state,
            scopes: scopes
        });
    });
}
exports.issueCredentialsByClient = issueCredentialsByClient;
/**
 * 任意のデータをJWTを使用して資格情報へ変換する
 *
 * @param {object} payload 変換したいデータ
 * @returns {Promise<ICredentials>} 資格情報
 */
function payload2credentials(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            debug('signing...', payload);
            jwt.sign(payload, process.env.TTTS_API_SECRET, {
                expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS
            }, (err, encoded) => {
                debug('jwt signed', err, encoded);
                if (err instanceof Error) {
                    reject(err);
                }
                else {
                    resolve({
                        access_token: encoded,
                        token_type: 'Bearer',
                        expires_in: ACCESS_TOKEN_EXPIRES_IN_SECONDS
                    });
                }
            });
        });
    });
}
exports.payload2credentials = payload2credentials;
