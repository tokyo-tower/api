/**
 * 認証コントローラー
 *
 * @namespace api/AuthController
 */

import { Models } from '@motionpicture/ttts-domain';
import * as crypto from 'crypto';
import { Request, Response } from 'express';

/**
 * ログイン
 *
 * @memberOf api/AuthController
 */
// tslint:disable-next-line:variable-name
export function login(_req: Request, res: Response): void {
    const SIZE = 64;
    const token = crypto.randomBytes(SIZE).toString('hex');
    Models.Authentication.findOneAndUpdate(
        {
            mvtk_kiin_cd: '00000775' // テスト用会員コード
        },
        {
            token: token
        },
        {
            upsert: true,
            new: true
        },
        (err, authentication) => {
            if (err) {
                res.json({
                    success: false,
                    access_token: null,
                    mvtk_kiin_cd: null
                });
            } else {
                res.json({
                    success: true,
                    access_token: authentication.get('token'),
                    mvtk_kiin_cd: authentication.get('mvtk_kiin_cd') // テスト用会員コード
                });
            }
        }
    );
}
