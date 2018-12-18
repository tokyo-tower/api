/**
 * devルーター
 *
 * @ignore
 */
import * as express from 'express';
const devRouter = express.Router();

import * as ttts from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
import { NO_CONTENT } from 'http-status';

import mongooseConnectionOptions from '../../mongooseConnectionOptions';

const debug = createDebug('ttts-api:routes:dev');

devRouter.get(
    '/500',
    () => {
        throw new Error('500 manually');
    });

devRouter.get(
    '/environmentVariables',
    (req, res) => {
        debug('ip:', req.ip);
        res.json({
            data: {
                type: 'envs',
                attributes: process.env
            }
        });
    });

devRouter.get(
    '/mongoose/connect',
    (__, res, next) => {
        ttts.mongoose.connect(<string>process.env.MONGOLAB_URI, mongooseConnectionOptions, (err) => {
            if (err instanceof Error) {
                next(err);

                return;
            }

            res.status(NO_CONTENT)
                .end();
        });
    });

devRouter.get(
    '/mongoose/disconnect',
    (__, res, next) => {
        ttts.mongoose.disconnect((err) => {
            if (err instanceof Error) {
                next(err);

                return;
            }

            res.status(NO_CONTENT)
                .end();
        });
    });

export default devRouter;
