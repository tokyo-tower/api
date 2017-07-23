/**
 * 予約ルーターテスト
 *
 * @ignore
 */

import * as TTTS from '@motionpicture/ttts-domain';
import * as assert from 'assert';
import * as httpStatus from 'http-status';
import * as mongoose from 'mongoose';
import * as supertest from 'supertest';

import * as app from '../app/app';

describe('予約ルーター 入場', () => {
    let connection: mongoose.Connection;
    before(async () => {
        connection = mongoose.createConnection(<string>process.env.MONGOLAB_URI);

        // 予約全削除
        await TTTS.Models.Reservation.remove({}).exec();

        await supertest(app)
            .post('/oauth/token')
            .send({
                grant_type: 'password',
                username: 'motionpicture',
                password: 'motionpicture',
                client_id: 'ttts-frontend',
                scope: ['admin']
            })
            .then((response) => {
                process.env.TTTS_API_ACCESS_TOKEN = response.body.access_token;
            });
    });

    it('ok', async () => {
        // テストデータ作成
        const reservationModel = connection.model(TTTS.Models.Reservation.modelName, TTTS.Models.Reservation.schema);
        let reservationDoc = await reservationModel.create({
            performance: 'xxx',
            seat_code: 'xxx',
            status: TTTS.ReservationUtil.STATUS_RESERVED
        });

        assert(reservationDoc.get('checked_in') === false);

        await supertest(app)
            .post(`/reservation/${reservationDoc.get('id')}/checkin`)
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
                where: 'here',
                why: 'for test',
                how: 'supertest'
            })
            .expect(httpStatus.NO_CONTENT)
            .then(async () => {
                // 入場履歴が追加されているかどうか確認
                reservationDoc = <mongoose.Document>await reservationModel.findById(reservationDoc.get('id')).exec();
                assert(reservationDoc.get('checked_in'));

                // テストデータ削除
                await reservationDoc.remove();
            });
    });

    it('予約存在しない', async () => {
        await supertest(app)
            .post('/reservation/5905b0003431b21604da462a/checkin')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(httpStatus.NOT_FOUND);
    });
});

describe('予約ルーター メール転送', () => {
    let connection: mongoose.Connection;
    before(async () => {
        connection = mongoose.createConnection(<string>process.env.MONGOLAB_URI);

        await supertest(app)
            .post('/oauth/token')
            .send({
                grant_type: 'password',
                username: 'motionpicture',
                password: 'motionpicture',
                client_id: 'ttts-frontend',
                scope: ['admin']
            })
            .then((response) => {
                process.env.TTTS_API_ACCESS_TOKEN = response.body.access_token;
            });
    });

    it('ok', async () => {
        // テストデータ作成
        const reservationModel = connection.model(TTTS.Models.Reservation.modelName, TTTS.Models.Reservation.schema);
        const reservationDoc = await reservationModel.create({
            performance: 'xxx',
            seat_code: 'xxx',
            status: TTTS.ReservationUtil.STATUS_RESERVED
        });

        await supertest(app)
            .post(`/ja/reservation/${reservationDoc.get('id')}/transfer`)
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
                to: 'hello@motionpicture.jp'
            })
            .expect(httpStatus.NO_CONTENT)
            .then(async () => {
                // テストデータ削除
                await reservationDoc.remove();
            });
    });

    it('メールアドレス不適切', async () => {
        await supertest(app)
            .post('/ja/reservation/5905b0003431b21604da462a/transfer')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
                to: 'invalidemail'
            })
            .expect('Content-Type', /json/)
            .expect(httpStatus.BAD_REQUEST);
    });

    it('予約存在しない', async () => {
        await supertest(app)
            .post('/ja/reservation/5905b0003431b21604da462a/transfer')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
                to: 'hello@motionpicture.jp'
            })
            .expect('Content-Type', /json/)
            .expect(httpStatus.NOT_FOUND);
    });
});
