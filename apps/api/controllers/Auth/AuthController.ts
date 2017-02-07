import express = require('express');
import { Models } from "@motionpicture/ttts-domain";
import crypto = require('crypto');

/**
 * ログイン
 */
export function login(_req: express.Request, res: express.Response): void {
    let token = crypto.randomBytes(64).toString('hex');
    Models.Authentication.findOneAndUpdate(
        {
            mvtk_kiin_cd: '00000775' // テスト用会員コード
        },
        {
            token: token,
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