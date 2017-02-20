/**
 * その他コントローラー
 *
 * @namespace api/OtherController
 */

import { Request, Response } from 'express';

/**
 * 環境変数リストを出力する
 *
 * @memberOf api/OtherController
 */
// tslint:disable-next-line:variable-name
export function environmentVariables(_req: Request, res: Response): void {
    res.json({
        success: true,
        variables: process.env
    });
}
