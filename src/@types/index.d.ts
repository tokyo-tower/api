/**
 * middlewares/authenticationにて、expressのrequestオブジェクトにAPIユーザー情報を追加している。
 * ユーザーの型をここで定義しています。
 * @ignore
 */
import * as express from 'express';

declare global {
    namespace Express {
        export interface IUser {
            sub: string;
            token_use: string;
            scope: string;
            scopes: string[];
            iss: string;
            exp: number;
            iat: number;
            version: number;
            jti: string;
            client_id: string;
            username?: string;
        }

        // tslint:disable-next-line:interface-name
        export interface Request {
            user: IUser;
            accessToken: string;
        }
    }
}
