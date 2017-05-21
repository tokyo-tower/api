/**
 * スクリーンコントローラー
 *
 * @namespace controller/screen
 */

import { Models } from '@motionpicture/ttts-domain';
import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs-extra';
import { NOT_FOUND, OK } from 'http-status';

/**
 * スクリーンの座席マップを生成する
 *
 * @memberOf controller/screen
 */
export async function show(req: Request, res: Response, next: NextFunction) {
    try {
        // スクリーンの存在確認
        const count = await Models.Screen.count({ _id: req.params.id }).exec();
        if (count === 0) {
            res.status(NOT_FOUND);
            res.json({
                data: null
            });
            return;
        }

        // スクリーン座席表HTMLを出力
        fs.readFile(`${__dirname}/../views/_screens/${req.params.id}.ejs`, 'utf8', (readFileErr, data) => {
            if (readFileErr instanceof Error) {
                next(readFileErr);
                return;
            }

            res.status(OK).json({
                data: data
            });
        });
    } catch (error) {
        next(error);
    }
}
