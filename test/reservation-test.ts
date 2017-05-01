/**
 * 予約ルーターテスト
 *
 * @ignore
 */

import * as chevre from '@motionpicture/chevre-domain';
import * as assert from 'assert';
import * as httpStatus from 'http-status';
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

describe('予約ルーター メール転送', () => {
    let connection: mongoose.Connection;
    before(async () => {
        connection = mongoose.createConnection(process.env.MONGOLAB_URI);
    });

    it('ok', async () => {
        // テストデータ作成
        const reservationModel = connection.model(chevre.Models.Reservation.modelName, chevre.Models.Reservation.schema);
        const reservationDoc = await reservationModel.create({
            performance: 'xxx',
            seat_code: 'xxx',
            status: chevre.ReservationUtil.STATUS_RESERVED
        });

        await supertest(app)
            .post(`/ja/reservation/${reservationDoc.get('id')}/transfer`)
            .send({
                to: 'hello@motionpicture.jp'
            })
            .expect(httpStatus.NO_CONTENT)
            .then(async () => {
                // テストデータ削除
                reservationDoc.remove();
            });
    });

    it('メールアドレス不適切', async () => {
        await supertest(app)
            .post('/ja/reservation/5905b0003431b21604da462a/transfer')
            .send({
                to: 'invalidemail'
            })
            .expect('Content-Type', /json/)
            .expect(httpStatus.BAD_REQUEST);
    });

    it('予約存在しない', async () => {
        await supertest(app)
            .post('/ja/reservation/5905b0003431b21604da462a/transfer')
            .send({
                to: 'hello@motionpicture.jp'
            })
            .expect('Content-Type', /json/)
            .expect(httpStatus.NOT_FOUND);
    });
});
