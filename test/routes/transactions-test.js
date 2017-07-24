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
// import * as mongoose from 'mongoose';
const supertest = require("supertest");
const app = require("../../app/app");
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
            reservationDoc = yield ttts.Models.Reservation.findById(reservationDoc).exec();
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
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        yield supertest(app)
            .post('/transactions/confirm')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({})
            .expect(httpStatus.OK)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            assert.deepEqual(response.body.data, {});
        }));
    }));
});
describe('座席本予約取消', () => {
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        yield supertest(app)
            .post('/transactions/cancel')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({})
            .expect(httpStatus.OK)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            assert.deepEqual(response.body.data, {});
        }));
    }));
});
