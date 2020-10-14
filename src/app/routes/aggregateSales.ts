/**
 * 売上集計ルーター
 */
import * as ttts from '@tokyotower/domain';

import * as createDebug from 'debug';
import { Router } from 'express';
import * as fastCsv from 'fast-csv';
import * as iconv from 'iconv-lite';
import * as moment from 'moment-timezone';
import * as mongoose from 'mongoose';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import rateLimit from '../middlewares/rateLimit';
import validator from '../middlewares/validator';

const debug = createDebug('ttts-api:router');

// カラム区切り(タブ)
const CSV_DELIMITER: string = '\t';
// 改行コード(CR+LF)
const CSV_LINE_ENDING: string = '\r\n';

const aggregateSalesRouter = Router();

aggregateSalesRouter.use(authentication);
aggregateSalesRouter.use(rateLimit);

/**
 * ストリーミング検索
 */
aggregateSalesRouter.get(
    '/stream',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            // 集計データにストリーミングcursorを作成する
            const aggregateSaleRepo = new ttts.repository.AggregateSale(mongoose.connection);
            debug('finding aggregateSales...', req.query);
            const andConditions = req.query.$and;
            const cursor = aggregateSaleRepo.aggregateSaleModel.find(
                (Array.isArray(andConditions) && andConditions.length > 0) ? { $and: andConditions } : {}
            )
                .sort({
                    'performance.startDay': 1,
                    'performance.startTime': 1,
                    payment_no: 1,
                    reservationStatus: -1,
                    'seat.code': 1,
                    status_sort: 1
                })
                .cursor();

            // Mongoドキュメントをcsvデータに変換するtransformer
            const transformer = (doc: any) => {
                // Return an object with all fields you need in the CSV
                return {
                    購入番号: doc.payment_no,
                    パフォーマンスID: doc.performance.id,
                    座席コード: doc.seat.code,
                    予約ステータス: doc.reservationStatus,
                    入塔予約年月日: doc.performance.startDay,
                    入塔予約時刻: doc.performance.startTime,
                    '---a': '',
                    '---b': '',
                    '---c': '',
                    '---d': '',
                    '---e': '',
                    購入者区分: doc.customer.group,
                    '購入者（名）': doc.customer.givenName,
                    '購入者（姓）': doc.customer.familyName,
                    購入者メール: doc.customer.email,
                    購入者電話: doc.customer.telephone,
                    購入日時: moment(doc.orderDate)
                        .tz('Asia/Tokyo')
                        .format('YYYY/MM/DD HH:mm:ss'),
                    決済方法: doc.paymentMethod,
                    '---f': '',
                    '---g': '',
                    券種名称: doc.ticketType.name,
                    チケットコード: doc.ticketType.csvCode,
                    券種料金: doc.ticketType.charge,
                    客層: doc.customer.segment,
                    payment_seat_index: (doc.payment_seat_index !== undefined && doc.payment_seat_index !== null)
                        ? String(doc.payment_seat_index)
                        : '',
                    予約単位料金: doc.price,
                    ユーザーネーム: doc.customer.username,
                    入場フラグ: doc.checkedin,
                    入場日時: doc.checkedin === 'TRUE'
                        ? moment(doc.checkinDate)
                            .tz('Asia/Tokyo')
                            .format('YYYY/MM/DD HH:mm:ss')
                        : ''
                };
            };

            // Create a Fast CSV stream which transforms documents to objects
            const csvStream = fastCsv
                .createWriteStream({
                    headers: true,
                    delimiter: CSV_DELIMITER,
                    quoteColumns: true,
                    rowDelimiter: CSV_LINE_ENDING
                    // includeEndRowDelimiter: true
                    // quote: '"',
                    // escape: '"'
                })
                .transform(transformer);

            // sjisに変換して流し込む
            cursor.pipe(csvStream)
                .pipe(iconv.decodeStream('utf-8'))
                .pipe(iconv.encodeStream('windows-31j'))
                .pipe(res);
        } catch (error) {
            next(error);
        }
    }
);

export default aggregateSalesRouter;
