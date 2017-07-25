"use strict";
/**
 * 予約ルーターテスト
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
describe('予約ルーター 入場', () => {
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        // テストデータ作成
        const reservation = {
            performance: 'xxx',
            seat_code: 'xxx',
            status: ttts.ReservationUtil.STATUS_RESERVED,
            checkins: []
        };
        let reservationDoc = yield ttts.Models.Reservation.findOneAndUpdate(reservation, reservation, { new: true, upsert: true }).exec();
        yield supertest(app)
            .post(`/reservations/${reservationDoc.get('id')}/checkins`)
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
            where: 'here',
            why: 'for test',
            how: 'supertest'
        })
            .expect(httpStatus.NO_CONTENT)
            .then(() => __awaiter(this, void 0, void 0, function* () {
            // 入場履歴が追加されているかどうか確認
            reservationDoc = (yield ttts.Models.Reservation.findById(reservationDoc.get('id')).exec());
            assert(reservationDoc.get('checked_in'));
            // テストデータ削除
            yield reservationDoc.remove();
        }));
    }));
    it('予約存在しない', () => __awaiter(this, void 0, void 0, function* () {
        yield supertest(app)
            .post('/reservations/5905b0003431b21604da462a/checkins')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(httpStatus.NOT_FOUND);
    }));
});
describe('予約ルーター メール転送', () => {
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        // テストデータ作成
        const reservationDoc = yield ttts.Models.Reservation.create({
            performance: 'xxx',
            seat_code: 'xxx',
            status: ttts.ReservationUtil.STATUS_RESERVED
        });
        yield supertest(app)
            .post(`/reservations/${reservationDoc.get('id')}/transfer`)
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
            to: 'hello@motionpicture.jp'
        })
            .expect(httpStatus.NO_CONTENT)
            .then(() => __awaiter(this, void 0, void 0, function* () {
            // テストデータ削除
            yield reservationDoc.remove();
        }));
    }));
    it('メールアドレス不適切', () => __awaiter(this, void 0, void 0, function* () {
        yield supertest(app)
            .post('/reservations/5905b0003431b21604da462a/transfer')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
            to: 'invalidemail'
        })
            .expect('Content-Type', /json/)
            .expect(httpStatus.BAD_REQUEST);
    }));
    it('予約存在しない', () => __awaiter(this, void 0, void 0, function* () {
        yield supertest(app)
            .post('/reservations/5905b0003431b21604da462a/transfer')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
            to: 'hello@motionpicture.jp'
        })
            .expect('Content-Type', /json/)
            .expect(httpStatus.NOT_FOUND);
    }));
});
describe('座席本予約取消', () => {
    it('予約が存在しなければ404', () => __awaiter(this, void 0, void 0, function* () {
        yield supertest(app)
            .post('/reservations/cancel')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
            performance_day: 'xxx',
            payment_no: 'xxx'
        })
            .expect(httpStatus.NOT_FOUND)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            console.error(response.body);
            assert.equal(response.body.data, null);
        }));
    }));
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
        // まず予約して予約番号を取得
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
        const paymentNo = yield supertest(app)
            .post('/transactions/confirm')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send(data)
            .expect(httpStatus.OK)
            .then((response) => {
            return response.body.data[0].attributes.payment_no;
        });
        // 本予約取消
        yield supertest(app)
            .post('/reservations/cancel')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
            performance_day: performanceDoc.get('day'),
            payment_no: paymentNo
        })
            .expect(httpStatus.NO_CONTENT)
            .then(() => __awaiter(this, void 0, void 0, function* () {
            // 予約が解放されていることを確認
            yield Promise.all(reservationDocs.map((doc) => __awaiter(this, void 0, void 0, function* () {
                const reservationDoc = yield ttts.Models.Reservation.findById(doc.get('id')).exec();
                assert.equal(reservationDoc.get('status'), ttts.ReservationUtil.STATUS_AVAILABLE);
            })));
            // テストデータ削除
            yield Promise.all(reservationDocs.map((doc) => __awaiter(this, void 0, void 0, function* () {
                yield doc.remove();
            })));
        }));
    }));
});
