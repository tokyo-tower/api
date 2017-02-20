/**
 * 先行予約アカウントタスクコントローラー
 *
 * @namespace task/PreCustomerController
 */

import { Models } from '@motionpicture/ttts-domain';
import * as Util from '../../../common/Util/Util';

import * as conf from 'config';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as log4js from 'log4js';
import * as mongodb from 'mongodb';
import * as mongoose from 'mongoose';

const MONGOLAB_URI = conf.get<string>('mongolab_uri');

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
    mongodb.MongoClient.connect(conf.get<string>('mongolab_uri'), (err, db) => {
        if (err) throw err;

        const collectionName = 'pre_customers';
        logger.debug('dropping collection...', collectionName);
        db.collection(collectionName).drop((dropErr) => {
            logger.debug('collection dropped.', collectionName, dropErr);
            logger.debug('creating collection.', collectionName);
            db.createCollection(collectionName, {}, (createCollectionErr) => {
                logger.debug('collection created.', collectionName, createCollectionErr);

                db.collection(collectionName).createIndex(
                    { user_id: 1 },
                    { unique: true },
                    (createIndexErr) => {
                        logger.debug('index created.', createIndexErr);

                        db.close();
                        process.exit(0);
                    }
                );
            });
        });

    });
}

/**
 *
 *
 * @memberOf task/PreCustomerController
 */
export function createFromJson(): void {
    mongoose.connect(MONGOLAB_URI, {});

    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/preCustomers.json`, 'utf8', (err, data) => {
        if (err) throw err;
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

        Models.PreCustomer.remove((removeErr: any) => {
            if (removeErr) throw removeErr;

            logger.debug('creating perCustomers...length:', docs.length);
            Models.PreCustomer.insertMany(docs, (insertErr) => {
                logger.debug('perCustomers created.', insertErr);

                mongoose.disconnect();
                process.exit(0);
            });
        });
    });
}
