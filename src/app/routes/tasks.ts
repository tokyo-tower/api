/**
 * タスクルーター
 */
import * as ttts from '@tokyotower/domain';
import { Router } from 'express';
import { body, query } from 'express-validator';
import { CREATED } from 'http-status';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import rateLimit from '../middlewares/rateLimit';
import validator from '../middlewares/validator';

const tasksRouter = Router();

tasksRouter.use(authentication);
tasksRouter.use(rateLimit);

/**
 * タスク作成
 */
tasksRouter.post(
    '/:name',
    permitScopes(['admin']),
    ...[
        body('runsAt')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`)
            .isISO8601(),
        body('remainingNumberOfTries')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`)
            .isInt(),
        body('data')
            .not()
            .isEmpty()
            .withMessage((_, options) => `${options.path} is required`)
    ],
    validator,
    async (req, res, next) => {
        try {
            const taskRepo = new ttts.repository.Task(mongoose.connection);
            const attributes: any = {
                name: req.params.name,
                status: ttts.factory.taskStatus.Ready,
                runsAt: moment(req.body.runsAt)
                    .toDate(),
                remainingNumberOfTries: Number(req.body.remainingNumberOfTries),
                numberOfTried: 0,
                executionResults: [],
                data: req.body.data
            };
            const task = await taskRepo.save(attributes);
            res.status(CREATED)
                .json(task);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * タスク確認
 */
tasksRouter.get(
    '/:name/:id',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const taskRepo = new ttts.repository.Task(mongoose.connection);
            const task = await taskRepo.findById({
                name: req.params.name,
                id: req.params.id
            });
            res.json(task);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * タスク検索
 */
tasksRouter.get(
    '',
    permitScopes(['admin']),
    ...[
        query('runsFrom')
            .optional()
            .isISO8601()
            .withMessage((_, options) => `${options.path} must be ISO8601 timestamp`)
            .toDate(),
        query('runsThrough')
            .optional()
            .isISO8601()
            .withMessage((_, options) => `${options.path} must be ISO8601 timestamp`)
            .toDate(),
        query('lastTriedFrom')
            .optional()
            .isISO8601()
            .withMessage((_, options) => `${options.path} must be ISO8601 timestamp`)
            .toDate(),
        query('lastTriedThrough')
            .optional()
            .isISO8601()
            .withMessage((_, options) => `${options.path} must be ISO8601 timestamp`)
            .toDate()
    ],
    validator,
    async (req, res, next) => {
        try {
            const taskRepo = new ttts.repository.Task(mongoose.connection);
            const searchConditions: any = {
                ...req.query,
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100,
                page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1,
                sort: (req.query.sort !== undefined) ? req.query.sort : { runsAt: ttts.factory.sortType.Descending }
            };
            const tasks = await taskRepo.search(searchConditions);
            const totalCount = await taskRepo.count(searchConditions);
            res.set('X-Total-Count', totalCount.toString());
            res.json(tasks);
        } catch (error) {
            next(error);
        }
    }
);

export default tasksRouter;
