/**
 * dbスキーマタスクコントローラー
 *
 * @namespace task/SchemaController
 */
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const log4js = require("log4js");
const mongodb = require("mongodb");
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
function createCollections() {
    mongodb.MongoClient.connect(process.env.MONGOLAB_URI, (err, db) => __awaiter(this, void 0, void 0, function* () {
        if (err !== null)
            throw err;
        const promises = collectionNames.map((collectionName) => __awaiter(this, void 0, void 0, function* () {
            logger.debug('dropping collection...', collectionName);
            yield db.collection(collectionName).drop();
            logger.debug('collection dropped.', collectionName);
            logger.debug('creating collection.', collectionName);
            yield db.createCollection(collectionName, {});
            logger.debug('collection created.', collectionName);
        }));
        yield Promise.all(promises);
        logger.info('promised.');
        yield db.close();
        process.exit(0);
    }));
}
exports.createCollections = createCollections;
/**
 * インデックスをリセットする
 *
 * @memberOf task/SchemaController
 */
function dropIndexes() {
    mongodb.MongoClient.connect(process.env.MONGOLAB_URI, (err, db) => __awaiter(this, void 0, void 0, function* () {
        if (err !== null)
            throw err;
        const promises = collectionNames.map((collectionName) => __awaiter(this, void 0, void 0, function* () {
            logger.debug('dropping index.', collectionName);
            yield db.collection(collectionName).dropIndexes();
            logger.debug('index droped.', collectionName);
        }));
        yield Promise.all(promises);
        logger.info('promised.');
        yield db.close();
        process.exit(0);
    }));
}
exports.dropIndexes = dropIndexes;
/**
 * インデックスを作成する
 *
 * @memberOf task/SchemaController
 */
function createIndexes() {
    // tslint:disable-next-line:max-func-body-length
    mongodb.MongoClient.connect(process.env.MONGOLAB_URI, (err, db) => __awaiter(this, void 0, void 0, function* () {
        if (err !== null)
            throw err;
        const promises = [];
        promises.push(new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            yield db.collection('reservations').createIndex({ performance: 1, seat_code: 1 }, { unique: true });
            logger.debug('index created.');
            resolve();
        })));
        promises.push(new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            yield db.collection('reservation_email_cues').createIndex({ payment_no: 1 }, { unique: true });
            logger.debug('index created.');
            resolve();
        })));
        promises.push(new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            yield db.collection('staffs').createIndex({ user_id: 1 }, { unique: true });
            logger.debug('index created.');
            resolve();
        })));
        promises.push(new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            yield db.collection('sponsors').createIndex({ user_id: 1 }, { unique: true });
            logger.debug('index created.');
            resolve();
        })));
        promises.push(new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            yield db.collection('pre_customers').createIndex({ user_id: 1 }, { unique: true });
            logger.debug('index created.');
            resolve();
        })));
        promises.push(new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            yield db.collection('windows').createIndex({ user_id: 1 }, { unique: true });
            logger.debug('index created.');
            resolve();
        })));
        promises.push(new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            yield db.collection('tel_staffs').createIndex({ user_id: 1 }, { unique: true });
            logger.debug('index created.');
            resolve();
        })));
        promises.push(new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            yield db.collection('members').createIndex({ user_id: 1 }, { unique: true });
            logger.debug('index created.');
            resolve();
        })));
        promises.push(new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            yield db.collection('performances').createIndex({ day: 1, start_time: 1 });
            logger.debug('index created.');
            resolve();
        })));
        yield Promise.all(promises);
        logger.info('promised.');
        yield db.close();
        process.exit(0);
    }));
}
exports.createIndexes = createIndexes;
