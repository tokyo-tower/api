/**
 * dbスキーマタスクコントローラー
 *
 * @namespace task/SchemaController
 */

import * as log4js from 'log4js';
import * as mongodb from 'mongodb';

// todo ログ出力方法考える
log4js.configure({
    appenders: [
        {
            category: 'system',
            type: 'console'
        }
    ],
    levels: {
        system: 'ALL'
    },
    replaceConsole: true
});
const logger = log4js.getLogger('system');

const collectionNames = [
    'authentications',
    'customer_cancel_requests',
    'films',
    'members',
    'performances',
    'pre_customers',
    'reservation_email_cues',
    'reservations',
    'screens',
    'sequences',
    'sponsors',
    'staffs',
    'tel_staffs',
    'theaters',
    'ticket_type_groups',
    'windows'
];

/**
 * 全コレクションを再作成する
 *
 * @memberOf task/SchemaController
 */
export function createCollections() {
    mongodb.MongoClient.connect(process.env.MONGOLAB_URI, (err, db) => {
        if (err) throw err;

        const promises = collectionNames.map((collectionName) => {
            return new Promise((resolve, reject) => {
                logger.debug('dropping collection...', collectionName);
                db.collection(collectionName).drop((dropErr) => {
                    logger.debug('collection dropped.', collectionName, dropErr);
                    logger.debug('creating collection.', collectionName);
                    db.createCollection(collectionName, {}, (createCollectionErr) => {
                        logger.debug('collection created.', collectionName, createCollectionErr);
                        (err) ? reject(err) : resolve();
                    });
                });
            });
        });

        Promise.all(promises).then(
            () => {
                logger.info('promised.');
                db.close();
                process.exit(0);
            },
            (promiseErr) => {
                logger.error('promised.', promiseErr);
                db.close();
                process.exit(0);
            }
        );
    });
}

/**
 * インデックスをリセットする
 *
 * @memberOf task/SchemaController
 */
export function dropIndexes() {
    mongodb.MongoClient.connect(process.env.MONGOLAB_URI, (err, db) => {
        if (err) throw err;

        const promises = collectionNames.map((collectionName) => {
            return new Promise((resolve, reject) => {
                logger.debug('dropping index.', collectionName);
                db.collection(collectionName).dropIndexes(
                    (dropIndexesErr) => {
                        logger.debug('index droped.', collectionName, dropIndexesErr);
                        (dropIndexesErr) ? reject(dropIndexesErr) : resolve();
                    }
                );
            });
        });

        Promise.all(promises).then(
            () => {
                logger.info('promised.');
                db.close();
                process.exit(0);
            },
            (promiseErr) => {
                logger.error('promised.', promiseErr);
                db.close();
                process.exit(0);
            }
        );
    });
}

/**
 * インデックスを作成する
 *
 * @memberOf task/SchemaController
 */
export function createIndexes() {
    // tslint:disable-next-line:max-func-body-length
    mongodb.MongoClient.connect(process.env.MONGOLAB_URI, (err, db) => {
        if (err) throw err;

        const promises = [];

        promises.push(new Promise((resolve, reject) => {
            db.collection('reservations').createIndex(
                { performance: 1, seat_code: 1 },
                { unique: true },
                (createIndexErr) => {
                    logger.debug('index created.', createIndexErr);
                    (createIndexErr) ? reject(createIndexErr) : resolve();
                }
            );
        }));

        promises.push(new Promise((resolve, reject) => {
            db.collection('reservation_email_cues').createIndex(
                { payment_no: 1 },
                { unique: true },
                (createIndexErr) => {
                    logger.debug('index created.', createIndexErr);
                    (createIndexErr) ? reject(createIndexErr) : resolve();
                }
            );
        }));

        promises.push(new Promise((resolve, reject) => {
            db.collection('staffs').createIndex(
                { user_id: 1 },
                { unique: true },
                (createIndexErr) => {
                    logger.debug('index created.', createIndexErr);
                    (createIndexErr) ? reject(createIndexErr) : resolve();
                }
            );
        }));

        promises.push(new Promise((resolve, reject) => {
            db.collection('sponsors').createIndex(
                { user_id: 1 },
                { unique: true },
                (createIndexErr) => {
                    logger.debug('index created.', createIndexErr);
                    (createIndexErr) ? reject(createIndexErr) : resolve();
                }
            );
        }));

        promises.push(new Promise((resolve, reject) => {
            db.collection('pre_customers').createIndex(
                { user_id: 1 },
                { unique: true },
                (createIndexErr) => {
                    logger.debug('index created.', createIndexErr);
                    (createIndexErr) ? reject(createIndexErr) : resolve();
                }
            );
        }));

        promises.push(new Promise((resolve, reject) => {
            db.collection('windows').createIndex(
                { user_id: 1 },
                { unique: true },
                (createIndexErr) => {
                    logger.debug('index created.', createIndexErr);
                    (createIndexErr) ? reject(createIndexErr) : resolve();
                }
            );
        }));

        promises.push(new Promise((resolve, reject) => {
            db.collection('tel_staffs').createIndex(
                { user_id: 1 },
                { unique: true },
                (createIndexErr) => {
                    logger.debug('index created.', createIndexErr);
                    (createIndexErr) ? reject(createIndexErr) : resolve();
                }
            );
        }));

        promises.push(new Promise((resolve, reject) => {
            db.collection('members').createIndex(
                { user_id: 1 },
                { unique: true },
                (createIndexErr) => {
                    logger.debug('index created.', createIndexErr);
                    (createIndexErr) ? reject(createIndexErr) : resolve();
                }
            );
        }));

        promises.push(new Promise((resolve, reject) => {
            db.collection('performances').createIndex(
                { day: 1, start_time: 1 },
                (createIndexErr) => {
                    logger.debug('index created.', createIndexErr);
                    (createIndexErr) ? reject(createIndexErr) : resolve();
                }
            );
        }));

        Promise.all(promises).then(
            () => {
                logger.info('promised.');
                db.close();
                process.exit(0);
            },
            (promiseErr) => {
                logger.error('promised.', promiseErr);
                db.close();
                process.exit(0);
            }
        );
    });
}
