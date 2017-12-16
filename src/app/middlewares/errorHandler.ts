/**
 * エラーハンドラーミドルウェア
 *
 * todo errの内容、エラーオブジェクトタイプによって、本来はステータスコードを細かくコントロールするべき
 * 現時点では、雑にコントロールしてある
 */
import * as ttts from '@motionpicture/ttts-domain';
import { NextFunction, Request, Response } from 'express';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, UNAUTHORIZED } from 'http-status';
import logger from '../logger';

export default (err: any, __: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        next(err);

        return;
    }

    if (err instanceof ttts.mongoose.mongo.MongoError || err instanceof ttts.mongoose.Error) {
        logger.error('ttts-api:iddleware:errorHandler', err);
        res.status(INTERNAL_SERVER_ERROR).json({
            errors: [
                {
                    title: 'internal server error',
                    detail: 'an unexpected error occurred'
                }
            ]
        });

        return;
    }

    // エラーオブジェクトの場合は、キャッチされた例外でクライント依存のエラーの可能性が高い
    if (err instanceof Error) {
        // oauth認証失敗
        if (err.name === 'UnauthorizedError') {
            res.status(UNAUTHORIZED).end('Unauthorized');
        } else {
            res.status(BAD_REQUEST).json({
                errors: [
                    {
                        title: err.name,
                        detail: err.message
                    }
                ]
            });
        }
    } else {
        logger.error('ttts-api:iddleware:errorHandler', err);
        res.status(INTERNAL_SERVER_ERROR).json({
            errors: [
                {
                    title: 'internal server error',
                    detail: 'an unexpected error occurred'
                }
            ]
        });
    }
};
