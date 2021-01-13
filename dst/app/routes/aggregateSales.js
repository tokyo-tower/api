"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
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
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const rateLimit_1 = require("../middlewares/rateLimit");
const validator_1 = require("../middlewares/validator");
const debug = createDebug('ttts-api:router');
const USE_NEW_REPORT_SORT = process.env.USE_NEW_REPORT_SORT === '1';
// カラム区切り(タブ)
const CSV_DELIMITER = '\t';
// 改行コード(CR+LF)
const CSV_LINE_ENDING = '\r\n';
const aggregateSalesRouter = express_1.Router();
aggregateSalesRouter.use(authentication_1.default);
aggregateSalesRouter.use(rateLimit_1.default);
/**
 * ストリーミング検索
 */
aggregateSalesRouter.get('/stream', permitScopes_1.default(['admin']), validator_1.default, 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let sort = {
            'performance.startDay': 1,
            'performance.startTime': 1,
            payment_no: 1,
            reservationStatus: -1,
            'seat.code': 1,
            status_sort: 1
        };
        if (USE_NEW_REPORT_SORT) {
            sort = { sortBy: 1 };
        }
        // 集計データにストリーミングcursorを作成する
        const reportRepo = new ttts.repository.Report(mongoose.connection);
        debug('finding aggregateSales...', req.query);
        const andConditions = req.query.$and;
        const cursor = reportRepo.aggregateSaleModel.find((Array.isArray(andConditions) && andConditions.length > 0) ? { $and: andConditions } : {})
            .sort(sort)
            .cursor();
        // Mongoドキュメントをcsvデータに変換するtransformer
        const transformer = (doc) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
            const eventDate = moment(doc.reservation.reservationFor.startDate)
                .toDate();
            const orderDate = (moment(doc.orderDate)
                .isAfter(moment(eventDate)
                .add(1, 'hour')))
                ? moment(doc.orderDate)
                    // tslint:disable-next-line:no-magic-numbers
                    .add(-9, 'hours')
                    .tz('Asia/Tokyo')
                    .format('YYYY/MM/DD HH:mm:ss')
                : moment(doc.orderDate)
                    .tz('Asia/Tokyo')
                    .format('YYYY/MM/DD HH:mm:ss');
            const attendDate = doc.checkedin === 'TRUE'
                ? (moment(doc.checkinDate)
                    .isAfter(moment(eventDate)
                    .add(1, 'hour')))
                    ? moment(doc.checkinDate)
                        // tslint:disable-next-line:no-magic-numbers
                        .add(-9, 'hours')
                        .tz('Asia/Tokyo')
                        .format('YYYY/MM/DD HH:mm:ss')
                    : moment(doc.checkinDate)
                        .tz('Asia/Tokyo')
                        .format('YYYY/MM/DD HH:mm:ss')
                : '';
            // Return an object with all fields you need in the CSV
            return {
                購入番号: String(doc.confirmationNumber),
                パフォーマンスID: (_b = (_a = doc.reservation) === null || _a === void 0 ? void 0 : _a.reservationFor) === null || _b === void 0 ? void 0 : _b.id,
                座席コード: (_e = (_d = (_c = doc.reservation) === null || _c === void 0 ? void 0 : _c.reservedTicket) === null || _d === void 0 ? void 0 : _d.ticketedSeat) === null || _e === void 0 ? void 0 : _e.seatNumber,
                予約ステータス: doc.category,
                入塔予約年月日: moment(doc.reservation.reservationFor.startDate)
                    .tz('Asia/Tokyo')
                    .format('YYYYMMDD'),
                入塔予約時刻: moment(doc.reservation.reservationFor.startDate)
                    .tz('Asia/Tokyo')
                    .format('HHmm'),
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
                購入日時: orderDate,
                決済方法: doc.paymentMethod,
                '---f': '',
                '---g': '',
                券種名称: (_j = (_h = (_g = (_f = doc.reservation) === null || _f === void 0 ? void 0 : _f.reservedTicket) === null || _g === void 0 ? void 0 : _g.ticketType) === null || _h === void 0 ? void 0 : _h.name) === null || _j === void 0 ? void 0 : _j.ja,
                チケットコード: (_m = (_l = (_k = doc.reservation) === null || _k === void 0 ? void 0 : _k.reservedTicket) === null || _l === void 0 ? void 0 : _l.ticketType) === null || _m === void 0 ? void 0 : _m.csvCode,
                券種料金: (_r = (_q = (_p = (_o = doc.reservation) === null || _o === void 0 ? void 0 : _o.reservedTicket) === null || _p === void 0 ? void 0 : _p.ticketType) === null || _q === void 0 ? void 0 : _q.priceSpecification) === null || _r === void 0 ? void 0 : _r.price,
                客層: doc.customer.segment,
                payment_seat_index: (typeof doc.payment_seat_index === 'string' || typeof doc.payment_seat_index === 'number')
                    ? String(doc.payment_seat_index)
                    : '',
                予約単位料金: doc.price,
                ユーザーネーム: doc.customer.username,
                入場フラグ: doc.checkedin,
                入場日時: attendDate
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
