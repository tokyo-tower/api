/**
 * 予約ルーターテスト
 *
 * @ignore
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as assert from 'assert';
import * as httpStatus from 'http-status';
import * as mongoose from 'mongoose';
import * as supertest from 'supertest';

import * as app from '../app/app';

describe('予約ルーター 入場', () => {
    it('ok', async () => {
        // テストデータ作成
        const reservation = {
            performance: 'xxx',
            seat_code: 'xxx',
            status: ttts.ReservationUtil.STATUS_RESERVED,
            checkins: []
        };
        let reservationDoc = await ttts.Models.Reservation.findOneAndUpdate(reservation, reservation, { new: true, upsert: true });

        await supertest(app)
            .post(`/reservation/${(<mongoose.Document>reservationDoc).get('id')}/checkin`)
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
                reservationDoc = <mongoose.Document>await ttts.Models.Reservation.findById(
                    (<mongoose.Document>reservationDoc).get('id')
                ).exec();
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
    it('ok', async () => {
        // テストデータ作成
        const reservationDoc = await ttts.Models.Reservation.create({
            performance: 'xxx',
            seat_code: 'xxx',
            status: ttts.ReservationUtil.STATUS_RESERVED
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
