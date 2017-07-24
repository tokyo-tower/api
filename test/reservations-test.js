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
const app = require("../app/app");
describe('予約ルーター 入場', () => {
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        // テストデータ作成
        const reservation = {
            performance: 'xxx',
            seat_code: 'xxx',
            status: ttts.ReservationUtil.STATUS_RESERVED,
            checkins: []
        };
        let reservationDoc = yield ttts.Models.Reservation.findOneAndUpdate(reservation, reservation, { new: true, upsert: true });
        yield supertest(app)
            .post(`/reservation/${reservationDoc.get('id')}/checkin`)
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
            .post('/reservation/5905b0003431b21604da462a/checkin')
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
            .post(`/ja/reservation/${reservationDoc.get('id')}/transfer`)
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
            .post('/ja/reservation/5905b0003431b21604da462a/transfer')
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
            .post('/ja/reservation/5905b0003431b21604da462a/transfer')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
            to: 'hello@motionpicture.jp'
        })
            .expect('Content-Type', /json/)
            .expect(httpStatus.NOT_FOUND);
    }));
});
