/**
 * 先行予約アカウントタスクコントローラー
 *
 * @namespace task/PreCustomerController
 */
"use strict";
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const Util = require("../../../common/Util/Util");
const crypto = require("crypto");
const fs = require("fs-extra");
const log4js = require("log4js");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
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
function createCollection() {
    mongodb.MongoClient.connect(process.env.MONGOLAB_URI, (err, db) => {
        if (err)
            throw err;
        const collectionName = 'pre_customers';
        logger.debug('dropping collection...', collectionName);
        db.collection(collectionName).drop((dropErr) => {
            logger.debug('collection dropped.', collectionName, dropErr);
            logger.debug('creating collection.', collectionName);
            db.createCollection(collectionName, {}, (createCollectionErr) => {
                logger.debug('collection created.', collectionName, createCollectionErr);
                db.collection(collectionName).createIndex({ user_id: 1 }, { unique: true }, (createIndexErr) => {
                    logger.debug('index created.', createIndexErr);
                    db.close();
                    process.exit(0);
                });
            });
        });
    });
}
exports.createCollection = createCollection;
/**
 *
 *
 * @memberOf task/PreCustomerController
 */
function createFromJson() {
    mongoose.connect(MONGOLAB_URI, {});
    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/preCustomers.json`, 'utf8', (err, data) => {
        if (err)
            throw err;
        const preCustomers = JSON.parse(data);
        // あれば更新、なければ追加
        const docs = preCustomers.map((preCustomer) => {
            // パスワードハッシュ化
            const SIZE = 64;
            const passwordSalt = crypto.randomBytes(SIZE).toString('hex');
            preCustomer.password_salt = passwordSalt;
            preCustomer.password_hash = Util.createHash(preCustomer.password, passwordSalt);
            return preCustomer;
        });
        chevre_domain_1.Models.PreCustomer.remove((removeErr) => {
            if (removeErr)
                throw removeErr;
            logger.debug('creating perCustomers...length:', docs.length);
            chevre_domain_1.Models.PreCustomer.insertMany(docs, (insertErr) => {
                logger.debug('perCustomers created.', insertErr);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    });
}
exports.createFromJson = createFromJson;
