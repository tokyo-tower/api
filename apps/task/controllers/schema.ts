/**
 * dbスキーマタスクコントローラー
 *
 * @namespace task/SchemaController
 */

import * as createDebug from 'debug';
import * as log4js from 'log4js';
import * as mongodb from 'mongodb';

const debug = createDebug('chevre-api:task:controller:schema');

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
    mongodb.MongoClient.connect(process.env.MONGOLAB_URI, async (err, db) => {
        if (err !== null) throw err;

        const promises = collectionNames.map(async (collectionName) => {
            // 初めてコレクションを作成の場合、dropに失敗する
            try {
                debug('dropping collection...', collectionName);
                await db.collection(collectionName).drop();
                debug('collection dropped.', collectionName);
            } catch (error) {
                debug('fain in dropping collection.', error);
            }

            debug('creating collection.', collectionName);
            await db.createCollection(collectionName, {});
            debug('collection created.', collectionName);
        });

        await Promise.all(promises);
        logger.info('promised.');
        await db.close();
        process.exit(0);
    });
}

/**
 * インデックスをリセットする
 *
 * @memberOf task/SchemaController
 */
export function dropIndexes() {
    mongodb.MongoClient.connect(process.env.MONGOLAB_URI, async (err, db) => {
        if (err !== null) throw err;

        const promises = collectionNames.map(async (collectionName) => {
            debug('dropping index.', collectionName);
            await db.collection(collectionName).dropIndexes();
            debug('index droped.', collectionName);
        });

        await Promise.all(promises);
        logger.info('promised.');
        await db.close();
        process.exit(0);
    });
}

/**
 * インデックスを作成する
 *
 * @memberOf task/SchemaController
 */
export function createIndexes() {
    // tslint:disable-next-line:max-func-body-length
    mongodb.MongoClient.connect(process.env.MONGOLAB_URI, async (err, db) => {
        if (err !== null) throw err;

        const promises: Promise<any>[] = [];

        promises.push(new Promise(async (resolve) => {
            await db.collection('reservations').createIndex(
                { performance: 1, seat_code: 1 },
                { unique: true }
            );
            debug('index created.');
            resolve();
        }));

        promises.push(new Promise(async (resolve) => {
            await db.collection('reservation_email_cues').createIndex(
                { payment_no: 1 },
                { unique: true }
            );
            debug('index created.');
            resolve();
        }));

        promises.push(new Promise(async (resolve) => {
            await db.collection('staffs').createIndex(
                { user_id: 1 },
                { unique: true }
            );
            debug('index created.');
            resolve();
        }));

        promises.push(new Promise(async (resolve) => {
            await db.collection('sponsors').createIndex(
                { user_id: 1 },
                { unique: true }
            );
            debug('index created.');
            resolve();
        }));

        promises.push(new Promise(async (resolve) => {
            await db.collection('pre_customers').createIndex(
                { user_id: 1 },
                { unique: true }
            );
            debug('index created.');
            resolve();
        }));

        promises.push(new Promise(async (resolve) => {
            await db.collection('windows').createIndex(
                { user_id: 1 },
                { unique: true }
            );
            debug('index created.');
            resolve();
        }));

        promises.push(new Promise(async (resolve) => {
            await db.collection('tel_staffs').createIndex(
                { user_id: 1 },
                { unique: true }
            );
            debug('index created.');
            resolve();
        }));

        promises.push(new Promise(async (resolve) => {
            await db.collection('members').createIndex(
                { user_id: 1 },
                { unique: true }
            );
            debug('index created.');
            resolve();
        }));

        promises.push(new Promise(async (resolve) => {
            await db.collection('performances').createIndex(
                { day: 1, start_time: 1 }
            );
            debug('index created.');
            resolve();
        }));

        await Promise.all(promises);
        logger.info('promised.');
        await db.close();
        process.exit(0);
    });
}
