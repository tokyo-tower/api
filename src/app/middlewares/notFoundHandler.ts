/**
 * 404ハンドラーミドルウェア
 * @module middlewares.notFoundHandler
 */

import * as ttts from '@tokyotower/domain';
import { NextFunction, Request, Response } from 'express';

export default (req: Request, __: Response, next: NextFunction) => {
    next(new ttts.factory.errors.NotFound(`router for [${req.originalUrl}]`));
};
