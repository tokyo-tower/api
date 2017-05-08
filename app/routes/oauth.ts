/**
 * oauthルーター
 *
 * @ignore
 */

import * as createDebug from 'debug';
import * as express from 'express';
import * as jwt from 'jsonwebtoken';

import validator from '../middlewares/validator';

const router = express.Router();
const debug = createDebug('chevre-api:*');
// todo どこで定義するか
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 1800;

router.all(
    '/token',
    (__1, __2, next) => {
        // req.checkBody('assertion', 'invalid assertion').notEmpty().withMessage('assertion is required')
        //     .equals(process.env.SSKTS_API_REFRESH_TOKEN);
        // req.checkBody('scope', 'invalid scope').notEmpty().withMessage('scope is required')
        //     .equals('admin');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            jwt.sign(
                {
                    scopes: req.body.scopes
                },
                process.env.CHEVRE_API_SECRET,
                {
                    expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS
                },
                (err, encoded) => {
                    debug(err, encoded);
                    if (err instanceof Error) {
                        throw err;
                    } else {
                        debug('encoded is', encoded);

                        res.json({
                            access_token: encoded,
                            token_type: 'Bearer',
                            expires_in: ACCESS_TOKEN_EXPIRES_IN_SECONDS
                        });
                    }
                }
            );
        } catch (error) {
            next(error);
        }
    });

export default router;
