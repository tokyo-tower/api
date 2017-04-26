/**
 * 予約ルーターテスト
 *
 * @ignore
 */

import * as chevre from '@motionpicture/chevre-domain';
import * as assert from 'assert';
import * as mongoose from 'mongoose';
import * as supertest from 'supertest';

import * as app from '../app/app';

describe('予約ルーター 入場', () => {
    let connection: mongoose.Connection;
    before(async () => {
        connection = mongoose.createConnection(process.env.MONGOLAB_URI);

        // 予約全削除
        await chevre.Models.Reservation.remove({}).exec();
    });

    it('ok', async () => {
        // テストデータ作成
        const reservationModel = connection.model(chevre.Models.Reservation.modelName, chevre.Models.Reservation.schema);
        let reservationDoc = await reservationModel.create({
            performance: 'xxx',
            seat_code: 'xxx',
            status: chevre.ReservationUtil.STATUS_RESERVED
        });

        assert(!reservationDoc.get('checked_in'));

        await supertest(app)
            .post(`/reservation/${reservationDoc.get('id')}/checkin`)
            .send({
                where: 'here',
                why: 'for test',
                how: 'supertest'
            })
            .expect('Content-Type', /json/)
            .then(async (response) => {
                assert(response.body.success);

                // 入場履歴が追加されているかどうか確認
                reservationDoc = await reservationModel.findById(reservationDoc.get('id'));
                assert(reservationDoc.get('checked_in'));

                // テストデータ削除
                reservationDoc.remove();
            });
    });
});
