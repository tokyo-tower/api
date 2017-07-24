"use strict";
/**
 * 取引ルーターテスト
 *
 * @ignore
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ttts = require("@motionpicture/ttts-domain");
const assert = require("assert");
const httpStatus = require("http-status");
const supertest = require("supertest");
const app = require("../../app/app");
const Resources = require("../resources");
describe('座席仮予約', () => {
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        // テストデータ作成
        const reservation = {
            performance: 123,
            seat_code: 'A-1',
            status: ttts.ReservationUtil.STATUS_AVAILABLE
        };
        const reservationDoc = yield ttts.Models.Reservation.findOneAndUpdate({
            performance: reservation.performance,
            seat_code: reservation.seat_code
        }, reservation, { new: true, upsert: true }).exec();
        yield supertest(app)
            .post('/transactions/authorizations')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
            performance: reservation.performance
        })
            .expect(httpStatus.OK)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            assert.equal(response.body.data.id, reservationDoc.get('id'));
            // テストデータ削除
            yield reservationDoc.remove();
        }));
    }));
    it('空席がなければ404', () => __awaiter(this, void 0, void 0, function* () {
        yield supertest(app)
            .post('/transactions/authorizations')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
            performance: 'xxx'
        })
            .expect(httpStatus.NOT_FOUND)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            assert.equal(response.body.data, null);
        }));
    }));
});
describe('座席仮予約解除', () => {
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        // テストデータ作成
        const reservation = {
            performance: 123,
            seat_code: 'A-1',
            status: ttts.ReservationUtil.STATUS_TEMPORARY
        };
        let reservationDoc = yield ttts.Models.Reservation.findOneAndUpdate({
            performance: reservation.performance,
            seat_code: reservation.seat_code
        }, reservation, { new: true, upsert: true }).exec();
        yield supertest(app)
            .delete(`/transactions/authorizations/${reservationDoc.get('id')}`)
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .expect(httpStatus.NO_CONTENT)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            assert.equal(response.text, '');
            // 予約が解放されていることを確認
            reservationDoc = (yield ttts.Models.Reservation.findById(reservationDoc.get('id')).exec());
            assert.equal(reservationDoc.get('status'), ttts.ReservationUtil.STATUS_AVAILABLE);
            // テストデータ削除
            yield reservationDoc.remove();
        }));
    }));
    it('該当予約がなければ404', () => __awaiter(this, void 0, void 0, function* () {
        // テストデータ作成
        const reservation = {
            performance: 123,
            seat_code: 'A-1',
            status: ttts.ReservationUtil.STATUS_AVAILABLE
        };
        const reservationDoc = yield ttts.Models.Reservation.findOneAndUpdate({
            performance: reservation.performance,
            seat_code: reservation.seat_code
        }, reservation, { new: true, upsert: true }).exec();
        yield supertest(app)
            .delete(`/transactions/authorizations/${reservationDoc.get('id')}`)
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .expect(httpStatus.NOT_FOUND)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            assert.equal(response.body.data, null);
            // テストデータ削除
            yield reservationDoc.remove();
        }));
    }));
});
describe('座席本予約', () => {
    // tslint:disable-next-line:max-func-body-length
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        // テストデータ作成
        yield ttts.Models.Theater.findByIdAndUpdate(Resources.theater.id, Resources.theater, { new: true, upsert: true }).exec();
        yield ttts.Models.Screen.findByIdAndUpdate(Resources.screen.id, Resources.screen, { new: true, upsert: true }).exec();
        yield ttts.Models.Film.findByIdAndUpdate(Resources.film.id, Resources.film, { new: true, upsert: true }).exec();
        const performanceDoc = yield ttts.Models.Performance.findOneAndUpdate({
            day: Resources.performance.day,
            film: Resources.performance.film,
            screen: Resources.performance.screen,
            start_time: Resources.performance.start_time
        }, Resources.performance, { new: true, upsert: true }).exec();
        const reservations = [
            {
                performance: performanceDoc.get('id'),
                seat_code: Resources.screen.sections[0].seats[0].code,
                status: ttts.ReservationUtil.STATUS_TEMPORARY
            },
            {
                performance: performanceDoc.get('id'),
                seat_code: Resources.screen.sections[0].seats[1].code,
                status: ttts.ReservationUtil.STATUS_TEMPORARY
            }
        ];
        const reservationDocs = yield Promise.all(reservations.map((reservation) => __awaiter(this, void 0, void 0, function* () {
            return yield ttts.Models.Reservation.findOneAndUpdate({
                performance: reservation.performance,
                seat_code: reservation.seat_code
            }, reservation, { new: true, upsert: true }).exec();
        })));
        const data = {
            performance: performanceDoc.get('id'),
            authorizations: reservationDocs.map((reservationDoc) => {
                return {
                    id: reservationDoc.get('id'),
                    attributes: {
                        ticket_type: '001',
                        ticket_type_name: {
                            en: 'english name',
                            ja: '日本語名称',
                            kr: '한국어 명칭'
                        },
                        ticket_type_charge: 1800,
                        charge: 1800
                    }
                };
            }),
            payment_method: 0,
            purchaser_group: '06',
            purchaser_first_name: 'タロウ',
            purchaser_last_name: 'モーションピクチャー',
            purchaser_email: 'motionpicture@example.com',
            purchaser_tel: '09012345678',
            purchaser_gender: '0'
        };
        yield supertest(app)
            .post('/transactions/confirm')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send(data)
            .expect(httpStatus.OK)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            assert(Array.isArray(response.body.data));
            // レスポンスデータの型を確認
            response.body.data.forEach((reservation) => {
                assert.equal(typeof reservation.id, 'string');
                assert.equal(typeof reservation.attributes.seat_code, 'string');
                assert.equal(typeof reservation.attributes.payment_no, 'string');
                assert.equal(typeof reservation.attributes.qr_str, 'string');
            });
            // 予約が解放されていることを確認
            yield Promise.all(reservationDocs.map((doc) => __awaiter(this, void 0, void 0, function* () {
                const reservationDoc = yield ttts.Models.Reservation.findById(doc.get('id')).exec();
                assert.equal(reservationDoc.get('status'), ttts.ReservationUtil.STATUS_RESERVED);
            })));
            // テストデータ削除
            yield Promise.all(reservationDocs.map((doc) => __awaiter(this, void 0, void 0, function* () {
                yield doc.remove();
            })));
        }));
    }));
});
