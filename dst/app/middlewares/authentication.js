"use strict";
/**
 * oauthミドルウェア
 * @module middlewares.authentication
 * @see https://aws.amazon.com/blogs/mobile/integrating-amazon-cognito-user-pools-with-api-gateway/
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
const createDebug = require("debug");
const jwt = require("jsonwebtoken");
// tslint:disable-next-line:no-require-imports no-var-requires
const jwkToPem = require('jwk-to-pem');
const request = require("request-promise-native");
const debug = createDebug('ttts-api:middlewares:authentication');
// 許可発行者リスト
const ISSUERS = process.env.TOKEN_ISSUERS.split(',');
// const permittedAudiences = [
//     '4flh35hcir4jl73s3puf7prljq',
//     '6figun12gcdtlj9e53p2u3oqvl'
// ];
const pemsByIssuer = {};
exports.default = (req, __, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // ヘッダーからBearerトークンを取り出す
        let token = null;
        if (typeof req.headers.authorization === 'string' && req.headers.authorization.split(' ')[0] === 'Bearer') {
            token = req.headers.authorization.split(' ')[1];
        }
        if (token === null) {
            throw new Error('authorization required');
        }
        const payload = yield validateToken(token, {
            issuers: ISSUERS,
            tokenUse: 'access' // access tokenのみ受け付ける
        });
        debug('verified! payload:', payload);
        req.user = Object.assign({}, payload, {
            // アクセストークンにはscopeとして定義されているので、scopesに変換
            scopes: (typeof payload.scope === 'string') ? payload.scope.split((' ')) : []
        });
        req.accessToken = token;
        next();
    }
    catch (error) {
        next(new ttts.factory.errors.Unauthorized(error.message));
    }
});
exports.URI_OPENID_CONFIGURATION = '/.well-known/openid-configuration';
function createPems(issuer) {
    return __awaiter(this, void 0, void 0, function* () {
        const openidConfiguration = yield request({
            url: `${issuer}${exports.URI_OPENID_CONFIGURATION}`,
            json: true
        }).then((body) => body);
        return request({
            url: openidConfiguration.jwks_uri,
            json: true
        }).then((body) => {
            debug('got jwks_uri', body);
            const pemsByKid = {};
            body.keys.forEach((key) => {
                pemsByKid[key.kid] = jwkToPem(key);
            });
            return pemsByKid;
        });
    });
}
/**
 * トークンを検証する
 */
function validateToken(token, verifyOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('validating token...', token);
        const decodedJwt = jwt.decode(token, { complete: true });
        if (!decodedJwt) {
            throw new Error('Not a valid JWT token.');
        }
        debug('decodedJwt:', decodedJwt);
        // audienceをチェック
        // if (decodedJwt.payload.aud !== AUDIENCE) {
        //     throw new Error('invalid audience');
        // }
        // tokenUseが期待通りでなければ拒否
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (verifyOptions.tokenUse !== undefined) {
            if (decodedJwt.payload.token_use !== verifyOptions.tokenUse) {
                throw new Error(`Not a ${verifyOptions.tokenUse}.`);
            }
        }
        // 許可発行者リストになければinvalid
        if (verifyOptions.issuers.indexOf(decodedJwt.payload.iss) < 0) {
            throw new Error('Unknown issuer.');
        }
        // 公開鍵未取得であればcognitoから取得
        if (pemsByIssuer[decodedJwt.payload.iss] === undefined) {
            pemsByIssuer[decodedJwt.payload.iss] = yield createPems(decodedJwt.payload.iss);
        }
        // トークンからkidを取り出して、対応するPEMを検索
        const pems = pemsByIssuer[decodedJwt.payload.iss];
        const pem = pems[decodedJwt.header.kid];
        if (pem === undefined) {
            throw new Error('Invalid access token.');
        }
        // 対応PEMがあればトークンを検証
        return new Promise((resolve, reject) => {
            jwt.verify(token, pem, {
                issuer: ISSUERS // 期待しているユーザープールで発行されたJWTトークンかどうか確認
                // audience: pemittedAudiences
            }, (err, payload) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    // Always generate the policy on value of 'sub' claim and not for 'username' because username is reassignable
                    // sub is UUID for a user which is never reassigned to another user
                    resolve(payload);
                }
            });
        });
    });
}
