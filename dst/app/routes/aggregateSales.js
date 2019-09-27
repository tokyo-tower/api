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
/**
 * 売上集計ルーター
 */
const ttts = require("@tokyotower/domain");
const createDebug = require("debug");
const express_1 = require("express");
const fastCsv = require("fast-csv");
const iconv = require("iconv-lite");
// tslint:disable-next-line:no-submodule-imports
// import { body, query } from 'express-validator/check';
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const debug = createDebug('ttts-api:router');
// カラム区切り(タブ)
const CSV_DELIMITER = '\t';
// 改行コード(CR+LF)
const CSV_LINE_ENDING = '\r\n';
const aggregateSalesRouter = express_1.Router();
aggregateSalesRouter.use(authentication_1.default);
/**
 * ストリーミング検索
 */
aggregateSalesRouter.get('/stream', permitScopes_1.default(['admin']), validator_1.default, 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // 集計データにストリーミングcursorを作成する
        const aggregateSaleRepo = new ttts.repository.AggregateSale(mongoose.connection);
        debug('finding aggregateSales...', req.query);
        const cursor = aggregateSaleRepo.aggregateSaleModel.find(req.query)
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
        const transformer = (doc) => {
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
                payment_seat_index: doc.payment_seat_index,
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
    }
    catch (error) {
        next(error);
    }
}));
exports.default = aggregateSalesRouter;
