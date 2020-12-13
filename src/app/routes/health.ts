/**
 * ヘルスチェックルーター
 */
import * as express from 'express';
import * as mongoose from 'mongoose';

const healthRouter = express.Router();

import { OK } from 'http-status';

// 接続確認をあきらめる時間(ミリ秒)
const TIMEOUT_GIVE_UP_CHECKING_IN_MILLISECONDS = 3000;

healthRouter.get(
    '',
    async (_, res, next) => {
        let timer: NodeJS.Timer | undefined;

        try {
            await new Promise(async (resolve, reject) => {
                let givenUpChecking = false;

                timer = setInterval(
                    async () => {
                        // すでにあきらめていたら何もしない
                        if (givenUpChecking) {
                            return;
                        }

                        if (typeof mongoose.connection?.db?.admin !== 'function') {
                            return;
                        }

                        try {
                            await mongoose.connection.db.admin()
                                .ping();

                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    },
                    // tslint:disable-next-line:no-magic-numbers
                    500
                );

                setTimeout(
                    () => {
                        givenUpChecking = true;
                        reject(new Error('unable to check MongoDB connection'));
                    },
                    TIMEOUT_GIVE_UP_CHECKING_IN_MILLISECONDS
                );
            });

            if (timer !== undefined) {
                clearInterval(timer);
            }

            res.status(OK)
                .send('healthy!');
        } catch (error) {
            if (timer !== undefined) {
                clearInterval(timer);
            }

            next(error);
        }
    });

// healthRouter.get(
//     '/closeMongo',
//     async (req, res, next) => {
//         try {
//             await mongoose.connection.close();

//             res.status(OK)
//                 .send('healthy!');
//         } catch (error) {
//             next(error);
//         }
//     }
// );

export default healthRouter;
