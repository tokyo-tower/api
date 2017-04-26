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
const chevre = require("@motionpicture/chevre-domain");
const assert = require("assert");
const mongoose = require("mongoose");
const supertest = require("supertest");
const app = require("../app/app");
describe('予約ルーター 入場', () => {
    let connection;
    before(() => __awaiter(this, void 0, void 0, function* () {
        connection = mongoose.createConnection(process.env.MONGOLAB_URI);
        // 予約全削除
        yield chevre.Models.Reservation.remove({}).exec();
    }));
    it('ok', () => __awaiter(this, void 0, void 0, function* () {
        // テストデータ作成
        const reservationModel = connection.model(chevre.Models.Reservation.modelName, chevre.Models.Reservation.schema);
        let reservationDoc = yield reservationModel.create({
            performance: 'xxx',
            seat_code: 'xxx',
            status: chevre.ReservationUtil.STATUS_RESERVED
        });
        assert(!reservationDoc.get('checked_in'));
        yield supertest(app)
            .post(`/reservation/${reservationDoc.get('id')}/checkin`)
            .send({
            where: 'here',
            why: 'for test',
            how: 'supertest'
        })
            .expect('Content-Type', /json/)
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            assert(response.body.success);
            // 入場履歴が追加されているかどうか確認
            reservationDoc = yield reservationModel.findById(reservationDoc.get('id'));
            assert(reservationDoc.get('checked_in'));
            // テストデータ削除
            reservationDoc.remove();
        }));
    }));
});
