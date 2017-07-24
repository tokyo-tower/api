/**
 * 取引ルーターテスト
 *
 * @ignore
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as assert from 'assert';
import * as httpStatus from 'http-status';
// import * as mongoose from 'mongoose';
import * as supertest from 'supertest';

import * as app from '../../app/app';

describe('座席仮予約', () => {
    it('ok', async () => {
        // テストデータ作成
        const reservation = {
            performance: 123,
            seat_code: 'A-1',
            status: ttts.ReservationUtil.STATUS_AVAILABLE
        };
        const reservationDoc = await ttts.Models.Reservation.findOneAndUpdate(
            {
                performance: reservation.performance,
                seat_code: reservation.seat_code
            },
            reservation,
            { new: true, upsert: true }
        ).exec();

        await supertest(app)
            .post('/transactions/authorizations')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
                performance: reservation.performance
            })
            .expect(httpStatus.OK)
            .then(async (response) => {
                assert.equal(response.body.data.id, (<ttts.mongoose.Document>reservationDoc).get('id'));
                await (<ttts.mongoose.Document>reservationDoc).remove();
            });
    });

    it('空席がなければ404', async () => {
        await supertest(app)
            .post('/transactions/authorizations')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
                performance: 'xxx'
            })
            .expect(httpStatus.NOT_FOUND)
            .then(async (response) => {
                assert.equal(response.body.data, null);
            });
    });
});

describe('座席仮予約解除', () => {
    it('ok', async () => {
        await supertest(app)
            .delete('/transactions/authorizations/xxx')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
            })
            .expect(httpStatus.OK)
            .then(async (response) => {
                assert.deepEqual(response.body.data, {});
            });
    });
});

describe('座席本予約', () => {
    it('ok', async () => {
        await supertest(app)
            .post('/transactions/confirm')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
            })
            .expect(httpStatus.OK)
            .then(async (response) => {
                assert.deepEqual(response.body.data, {});
            });
    });
});

describe('座席本予約取消', () => {
    it('ok', async () => {
        await supertest(app)
            .post('/transactions/cancel')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
            })
            .expect(httpStatus.OK)
            .then(async (response) => {
                assert.deepEqual(response.body.data, {});
            });
    });
});
