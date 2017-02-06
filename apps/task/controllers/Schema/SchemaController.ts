import BaseController from '../BaseController';
import conf = require('config');
import mongodb = require('mongodb');

export default class SchemaController extends BaseController {
    private collectionNames = [
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
     */
    public createCollections() {
        mongodb.MongoClient.connect(conf.get<string>('mongolab_uri'), (err, db) => {
            if (err) throw err;

            let promises = this.collectionNames.map((collectionName) => {
                return new Promise((resolve, reject) => {
                    this.logger.debug('dropping collection...', collectionName);
                    db.collection(collectionName).drop((err) => {
                        this.logger.debug('collection dropped.', collectionName, err);
                        this.logger.debug('creating collection.', collectionName);
                        db.createCollection(collectionName, {}, (err) => {
                            this.logger.debug('collection created.', collectionName, err);
                            (err) ? reject(err) : resolve();
                        });
                    });
                });
            });

            Promise.all(promises).then(() => {
                this.logger.info('promised.');
                db.close();
                process.exit(0);
            }, (err) => {
                this.logger.error('promised.', err);
                db.close();
                process.exit(0);
            });
        });
    }

    /**
     * インデックスをリセットする
     */
    public dropIndexes() {
        mongodb.MongoClient.connect(conf.get<string>('mongolab_uri'), (err, db) => {
            if (err) throw err;

            let promises = this.collectionNames.map((collectionName) => {
                return new Promise((resolve, reject) => {
                    this.logger.debug('dropping index.', collectionName);
                    db.collection(collectionName).dropIndexes(
                        (err) => {
                            this.logger.debug('index droped.', collectionName, err);
                            (err) ? reject(err) : resolve();
                        }
                    );
                });
            });

            Promise.all(promises).then(() => {
                this.logger.info('promised.');
                db.close();
                process.exit(0);
            }, (err) => {
                this.logger.error('promised.', err);
                db.close();
                process.exit(0);
            });
        });
    }

    /**
     * インデックスを作成する
     */
    public createIndexes() {
        mongodb.MongoClient.connect(conf.get<string>('mongolab_uri'), (err, db) => {
            if (err) throw err;

            let promises = [];

            promises.push(new Promise((resolve, reject) => {
                db.collection('reservations').createIndex(
                    {performance: 1,seat_code: 1},
                    {unique: true},
                    (err) => {
                        this.logger.debug('index created.', err);
                        (err) ? reject(err) : resolve();
                    }
                );
            }));

            promises.push(new Promise((resolve, reject) => {
                db.collection('reservation_email_cues').createIndex(
                    {payment_no: 1},
                    {unique: true},
                    (err) => {
                        this.logger.debug('index created.', err);
                        (err) ? reject(err) : resolve();
                    }
                );
            }));

            promises.push(new Promise((resolve, reject) => {
                db.collection('staffs').createIndex(
                    {user_id: 1},
                    {unique: true},
                    (err) => {
                        this.logger.debug('index created.', err);
                        (err) ? reject(err) : resolve();
                    }
                );
            }));

            promises.push(new Promise((resolve, reject) => {
                db.collection('sponsors').createIndex(
                    {user_id: 1},
                    {unique: true},
                    (err) => {
                        this.logger.debug('index created.', err);
                        (err) ? reject(err) : resolve();
                    }
                );
            }));

            promises.push(new Promise((resolve, reject) => {
                db.collection('pre_customers').createIndex(
                    {user_id: 1},
                    {unique: true},
                    (err) => {
                        this.logger.debug('index created.', err);
                        (err) ? reject(err) : resolve();
                    }
                );
            }));

            promises.push(new Promise((resolve, reject) => {
                db.collection('windows').createIndex(
                    {user_id: 1},
                    {unique: true},
                    (err) => {
                        this.logger.debug('index created.', err);
                        (err) ? reject(err) : resolve();
                    }
                );
            }));

            promises.push(new Promise((resolve, reject) => {
                db.collection('tel_staffs').createIndex(
                    {user_id: 1},
                    {unique: true},
                    (err) => {
                        this.logger.debug('index created.', err);
                        (err) ? reject(err) : resolve();
                    }
                );
            }));

            promises.push(new Promise((resolve, reject) => {
                db.collection('members').createIndex(
                    {user_id: 1},
                    {unique: true},
                    (err) => {
                        this.logger.debug('index created.', err);
                        (err) ? reject(err) : resolve();
                    }
                );
            }));

            promises.push(new Promise((resolve, reject) => {
                db.collection('performances').createIndex(
                    {day: 1,start_time: 1},
                    (err) => {
                        this.logger.debug('index created.', err);
                        (err) ? reject(err) : resolve();
                    }
                );
            }));

            Promise.all(promises).then(() => {
                this.logger.info('promised.');
                db.close();
                process.exit(0);
            }, (err) => {
                this.logger.error('promised.', err);
                db.close();
                process.exit(0);
            });
        });
    }
}
