/**
 * タスクルーター
 */
import * as ttts from '@tokyotower/domain';
import { Router } from 'express';
// tslint:disable-next-line:no-submodule-imports
import { body } from 'express-validator/check';
import { NO_CONTENT } from 'http-status';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const redisClient = ttts.redis.createClient({
    host: <string>process.env.REDIS_HOST,
    port: Number(<string>process.env.REDIS_PORT),
    password: <string>process.env.REDIS_KEY,
    tls: { servername: <string>process.env.REDIS_HOST }
});

const WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS = 3600;

const ticketTypeCategoryRateLimitsRouter = Router();
ticketTypeCategoryRateLimitsRouter.use(authentication);

/**
 * lock
 */
ticketTypeCategoryRateLimitsRouter.post(
    '/lock',
    permitScopes(['admin', 'pos', 'transactions']),
    ...[
        body('ticketTypeCategory')
            .not()
            .isEmpty()
            .withMessage(() => 'required'),
        body('performanceStartDate')
            .not()
            .isEmpty()
            .withMessage(() => 'required')
            .isISO8601()
            .toDate(),
        body('holder')
            .not()
            .isEmpty()
            .withMessage(() => 'required')
    ],
    validator,
    async (req, res, next) => {
        try {
            const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);

            const rateLimitKey = {
                ticketTypeCategory: req.body.ticketTypeCategory,
                performanceStartDate: req.body.performanceStartDate,
                unitInSeconds: WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
            };
            await rateLimitRepo.lock(rateLimitKey, req.body.holder);

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * unlock
 */
ticketTypeCategoryRateLimitsRouter.post(
    '/unlock',
    permitScopes(['admin', 'pos', 'transactions']),
    ...[
        body('ticketTypeCategory')
            .not()
            .isEmpty()
            .withMessage(() => 'required'),
        body('performanceStartDate')
            .not()
            .isEmpty()
            .withMessage(() => 'required')
            .isISO8601()
            .toDate(),
        body('holder')
            .not()
            .isEmpty()
            .withMessage(() => 'required')
    ],
    validator,
    async (req, res, next) => {
        try {
            const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);

            const rateLimitKey = {
                ticketTypeCategory: req.body.ticketTypeCategory,
                performanceStartDate: req.body.performanceStartDate,
                unitInSeconds: WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
            };
            const holder = await rateLimitRepo.getHolder(rateLimitKey);
            if (holder === req.body.holder) {
                await rateLimitRepo.unlock(rateLimitKey);
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default ticketTypeCategoryRateLimitsRouter;
