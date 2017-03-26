/**
 * 先行予約アカウントタスクコントローラー
 *
 * @namespace task/PreCustomerController
 */

import { Models } from '@motionpicture/chevre-domain';
import * as Util from '../../../common/Util/Util';

import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as log4js from 'log4js';
import * as mongodb from 'mongodb';
import * as mongoose from 'mongoose';

const MONGOLAB_URI = process.env.MONGOLAB_URI;

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

/**
 *
 *
 * @memberOf task/PreCustomerController
 */
export function createCollection() {
    mongodb.MongoClient.connect(process.env.MONGOLAB_URI, async (err, db) => {
        if (err !== null) throw err;

        const collectionName = 'pre_customers';
        logger.debug('dropping collection...', collectionName);
        await db.collection(collectionName).drop();
        logger.debug('collection dropped.', collectionName);

        logger.debug('creating collection.', collectionName);
        await db.createCollection(collectionName, {});
        logger.debug('collection created.', collectionName);

        await db.collection(collectionName).createIndex(
            { user_id: 1 },
            { unique: true }
        );
        logger.debug('index created.');

        await db.close();
        process.exit(0);
    });
}

/**
 *
 *
 * @memberOf task/PreCustomerController
 */
export function createFromJson(): void {
    mongoose.connect(MONGOLAB_URI, {});

    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/preCustomers.json`, 'utf8', async (err, data) => {
        if (err instanceof Error) throw err;
        const preCustomers: any[] = JSON.parse(data);

        // あれば更新、なければ追加
        const docs = preCustomers.map((preCustomer) => {
            // パスワードハッシュ化
            const SIZE = 64;
            const passwordSalt = crypto.randomBytes(SIZE).toString('hex');
            preCustomer.password_salt = passwordSalt;
            preCustomer.password_hash = Util.createHash(preCustomer.password, passwordSalt);
            return preCustomer;
        });

        await Models.PreCustomer.remove({}).exec();
        logger.debug('creating perCustomers...length:', docs.length);
        await Models.PreCustomer.insertMany(docs);
        logger.debug('perCustomers created.');

        mongoose.disconnect();
        process.exit(0);
    });
}
