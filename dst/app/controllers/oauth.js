// tslint:disable-next-line:no-useless-files
/**
 * OAuthコントローラー
 * @namespace controllers/oauth
 */
// import * as ttts from '@motionpicture/ttts-domain';
// import * as bcrypt from 'bcryptjs';
// import * as createDebug from 'debug';
// import { Request } from 'express';
// import * as jwt from 'jsonwebtoken';
// const debug = createDebug('ttts-api:controllers:oAuth');
// // todo どこで定義するか
// const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 1800;
// export const MESSAGE_UNIMPLEMENTED_GRANT_TYPE = 'grant_type not implemented';
// export const MESSAGE_INVALID_CLIENT_CREDENTIALS = 'invalid client id or secret';
// /**
//  * 資格情報インターフェース
//  *
//  * @interface ICredentials
//  */
// export interface ICredentials {
//     access_token: string;
//     token_type: string;
//     expires_in: number;
// }
// /**
//  * 資格情報を発行する
//  * @param {Request} req リクエストオブジェクト
//  * @returns {Promise<ICredentials>} 資格情報
//  */
// export async function issueCredentials(req: Request): Promise<ICredentials> {
//     switch (req.body.grant_type) {
//         case 'client_credentials':
//             return issueCredentialsByClient(req.body.client_id, req.body.client_secret, req.body.state, req.body.scopes);
//         default:
//             // 非対応認可タイプ
//             throw new Error(MESSAGE_UNIMPLEMENTED_GRANT_TYPE);
//     }
// }
// /**
//  * クライアントIDから資格情報を発行する
//  * @param {string} clientId クライアントID
//  * @param {string[]} scopes スコープリスト
//  * @returns {Promise<ICredentials>} 資格情報
//  */
// export async function issueCredentialsByClient(
//     clientId: string, clientSecret: string, state: string, scopes: string[]
// ): Promise<ICredentials> {
//     // クライアントの存在確認
//     const clientDoc = await ttts.Models.Client.findById(clientId).exec();
//     if (clientDoc === null) {
//         throw new Error(MESSAGE_INVALID_CLIENT_CREDENTIALS);
//     }
//     // クライアントシークレット確認
//     debug('comparing secret...');
//     if (!await bcrypt.compare(clientSecret, clientDoc.get('secret_hash'))) {
//         throw new Error(MESSAGE_INVALID_CLIENT_CREDENTIALS);
//     }
//     return payload2credentials({
//         client_id: clientId,
//         sub: clientId,
//         state: state,
//         scopes: scopes
//     });
// }
// /**
//  * 任意のデータをJWTを使用して資格情報へ変換する
//  * @param {object} payload 変換したいデータ
//  * @returns {Promise<ICredentials>} 資格情報
//  */
// export async function payload2credentials(payload: Express.IUser): Promise<ICredentials> {
//     return new Promise<ICredentials>((resolve, reject) => {
//         debug('signing...', payload);
//         jwt.sign(
//             payload,
//             <string>process.env.TTTS_API_SECRET,
//             {
//                 expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS
//             },
//             (err, encoded) => {
//                 debug('jwt signed', err, encoded);
//                 if (err instanceof Error) {
//                     reject(err);
//                 } else {
//                     resolve({
//                         access_token: encoded,
//                         token_type: 'Bearer',
//                         expires_in: ACCESS_TOKEN_EXPIRES_IN_SECONDS
//                     });
//                 }
//             }
//         );
//     });
// }
