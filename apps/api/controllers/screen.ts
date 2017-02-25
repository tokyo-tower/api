/**
 * スクリーンコントローラー
 *
 * @namespace api/ScreenController
 */

import { Models } from '@motionpicture/chevre-domain';
import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs-extra';

/**
 * スクリーンの座席マップを生成する
 *
 * @memberOf api/ScreenController
 */
export function show(req: Request, res: Response, next: NextFunction) {
    // スクリーンを取得
    Models.Screen.count(
        {
            _id: req.params.id
        },
        (err, count) => {
            if (err) {
                res.send('false');
                return;
            }
            if (count === 0) {
                res.send('false');
                return;
            }

            // スクリーン座席表HTMLを出力
            res.type('txt');
            fs.readFile(`${__dirname}/../../../common/views/screens/${req.params.id}.ejs`, 'utf8', (readFileErr, data) => {
                if (readFileErr) return next(readFileErr);

                res.send(data);
            });
        }
    );
}
