/**
 * アプリケーション固有の型
 */
import * as ttts from '@motionpicture/ttts-domain';
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
            project: ttts.factory.project.IProject;
            agent: ttts.factory.person.IPerson;
            user: IUser;
            accessToken: string;
        }
    }
}
