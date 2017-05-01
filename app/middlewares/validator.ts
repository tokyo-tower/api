/**
 * バリデータミドルウェア
 *
 * リクエストのパラメータ(query strings or body parameters)に対するバリデーション
 */
import { NextFunction, Request, Response } from 'express';
import { BAD_REQUEST } from 'http-status';

export default async (req: Request, res: Response, next: NextFunction) => {
    const validatorResult = await req.getValidationResult();
    if (!validatorResult.isEmpty()) {
        res.status(BAD_REQUEST);
        res.json({
            errors: validatorResult.array().map((mappedRrror) => {
                return {
                    source: { parameter: mappedRrror.param },
                    title: 'invalid parameter',
                    detail: mappedRrror.msg
                };
            })
        });
        return;
    }

    next();
};
