/**
 * oauthミドルウェア
 * @module middlewares.authentication
 * @see https://aws.amazon.com/blogs/mobile/integrating-amazon-cognito-user-pools-with-api-gateway/
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
// tslint:disable-next-line:no-require-imports no-var-requires
const jwkToPem = require('jwk-to-pem');
import * as request from 'request-promise-native';

const debug = createDebug('ttts-api:middlewares:authentication');

/**
 * cognito認可サーバーのOPEN ID構成インターフェース
 * @export
 * @interface
 */
export interface IOpenIdConfiguration {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    jwks_uri: string;
    response_types_supported: string[];
    subject_types_supported: string[];
    version: string;
    id_token_signing_alg_values_supported: string[];
    x509_url: string;
}

/**
 * トークンに含まれる情報インターフェース
 * @export
 * @interface
 */
export interface IPayload {
    sub: string;
    token_use: string;
    scope: string;
    iss: string;
    exp: number;
    iat: number;
    version: number;
    jti: string;
    client_id: string;
    username?: string;
}

/**
 * 公開鍵インターフェース
 * @export
 * @interface
 */
export interface IPems {
    [key: string]: string;
}

const ISSUER = <string>process.env.TOKEN_ISSUER;
let pems: IPems;
// const permittedAudiences = [
//     '4flh35hcir4jl73s3puf7prljq',
//     '6figun12gcdtlj9e53p2u3oqvl'
// ];

export default async (req: Request, __: Response, next: NextFunction) => {
    try {
        // ヘッダーからBearerトークンを取り出す
        let token: string | null = null;
        if (typeof req.headers.authorization === 'string' && (<string>req.headers.authorization).split(' ')[0] === 'Bearer') {
            token = (<string>req.headers.authorization).split(' ')[1];
        }

        if (token === null) {
            throw new Error('authorization required');
        }

        const payload = await validateToken(token, {
            issuer: ISSUER,
            tokenUse: 'access' // access tokenのみ受け付ける
        });
        debug('verified! payload:', payload);
        req.user = {
            ...payload,
            ...{
                // アクセストークンにはscopeとして定義されているので、scopesに変換
                scopes: (typeof payload.scope === 'string') ? (<string>payload.scope).split((' ')) : []
            }
        };
        req.accessToken = token;

        next();
    } catch (error) {
        next(new ttts.factory.errors.Unauthorized(error.message));
    }
};

export const URI_OPENID_CONFIGURATION = '/.well-known/openid-configuration';
async function createPems(issuer: string) {
    const openidConfiguration: IOpenIdConfiguration = await request({
        url: `${issuer}${URI_OPENID_CONFIGURATION}`,
        json: true
    }).then((body) => body);

    return request({
        url: openidConfiguration.jwks_uri,
        json: true
    }).then((body) => {
        debug('got jwks_uri', body);
        const pemsByKid: IPems = {};
        (<any[]>body.keys).forEach((key) => {
            pemsByKid[key.kid] = jwkToPem(key);
        });

        return pemsByKid;
    });
}

/**
 * トークンを検証する
 */
async function validateToken(token: string, verifyOptions: {
    issuer: string;
    tokenUse?: string;
}): Promise<IPayload> {
    debug('validating token...', token);
    const decodedJwt = <any>jwt.decode(token, { complete: true });
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

    // 公開鍵未取得であればcognitoから取得
    if (pems === undefined) {
        pems = await createPems(verifyOptions.issuer);
    }

    // トークンからkidを取り出して、対応するPEMを検索
    const pem = pems[decodedJwt.header.kid];
    if (pem === undefined) {
        throw new Error('Invalid access token.');
    }

    // 対応PEMがあればトークンを検証
    return new Promise<IPayload>((resolve, reject) => {
        jwt.verify(
            token,
            pem,
            {
                issuer: ISSUER // 期待しているユーザープールで発行されたJWTトークンかどうか確認
                // audience: pemittedAudiences
            },
            (err, payload) => {
                if (err !== null) {
                    reject(err);
                } else {
                    // Always generate the policy on value of 'sub' claim and not for 'username' because username is reassignable
                    // sub is UUID for a user which is never reassigned to another user
                    resolve(<IPayload>payload);
                }
            }
        );
    });
}
