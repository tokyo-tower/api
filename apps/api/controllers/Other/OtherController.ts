/**
 * その他コントローラー
 *
 * @namespace OtherController
 */

import * as express from 'express';

// tslint:disable-next-line:variable-name
export function environmentVariables(_req: express.Request, res: express.Response): void {
    res.json({
        success: true,
        variables: process.env
    });
}
