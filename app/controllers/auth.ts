/**
 * 認証コントローラー
 *
 * @namespace AuthController
 */

import { Models } from '@motionpicture/ttts-domain';
import * as crypto from 'crypto';
import { Request, Response } from 'express';
import * as mongoose from 'mongoose';

/**
 * ログイン
 *
 * @memberOf AuthController
 */
export async function login(_: Request, res: Response) {
    const SIZE = 64;
    const token = crypto.randomBytes(SIZE).toString('hex');

    try {
        const authentication = await Models.Authentication.findOneAndUpdate(
            {
                mvtk_kiin_cd: '00000775' // テスト用会員コード
            },
            {
                token: token
            },
            {
                upsert: true,
                new: true
            }
        ).exec();

        res.json({
            success: true,
            access_token: (<mongoose.Document>authentication).get('token'),
            mvtk_kiin_cd: (<mongoose.Document>authentication).get('mvtk_kiin_cd') // テスト用会員コード
        });
    } catch (error) {
        res.json({
            success: false,
            access_token: null,
            mvtk_kiin_cd: null
        });
    }
}
