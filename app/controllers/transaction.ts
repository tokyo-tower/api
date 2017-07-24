/**
 * 取引コントローラー
 *
 * @namespace controllers/transaction
 */

// import * as ttts from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';
import * as httpStatus from 'http-status';

const debug = createDebug('ttts-api:controllers:transaction');

export async function createAuthorization(req: Request, res: Response, next: NextFunction) {
    debug(req.body);

    try {
        res.status(httpStatus.OK).json({
            data: {}
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteAuthorization(req: Request, res: Response, next: NextFunction) {
    debug(req.body);

    try {
        res.status(httpStatus.OK).json({
            data: {}
        });
    } catch (error) {
        next(error);
    }
}

export async function confirm(req: Request, res: Response, next: NextFunction) {
    debug(req.body);

    try {
        res.status(httpStatus.OK).json({
            data: {}
        });
    } catch (error) {
        next(error);
    }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
    debug(req.body);

    try {
        res.status(httpStatus.OK).json({
            data: {}
        });
    } catch (error) {
        next(error);
    }
}
