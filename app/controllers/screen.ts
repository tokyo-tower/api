/**
 * スクリーンコントローラー
 *
 * @namespace ScreenController
 */

import { Models } from '@motionpicture/chevre-domain';
import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs-extra';

/**
 * スクリーンの座席マップを生成する
 *
 * @memberOf ScreenController
 */
export async function show(req: Request, res: Response, next: NextFunction) {
    try {
        // スクリーンを取得
        const count = await Models.Screen.count(
            {
                _id: req.params.id
            }
        ).exec();

        if (count === 0) {
            res.type('txt').send('false');
            return;
        }

        // スクリーン座席表HTMLを出力
        fs.readFile(`${__dirname}/../../common/views/screens/${req.params.id}.ejs`, 'utf8', (readFileErr, data) => {
            if (readFileErr instanceof Error) {
                next(readFileErr);
                return;
            }

            res.type('txt').send(data);
        });
    } catch (error) {
        res.send('false');
    }
}
