/**
 * 取引ルーターテスト
 *
 * @ignore
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as assert from 'assert';
import * as httpStatus from 'http-status';
import * as supertest from 'supertest';

import * as app from '../../app/app';
import * as Resources from '../resources';

describe('座席仮予約', () => {
    it('ok', async () => {
        // テストデータ作成
        const reservation = {
            performance: 123,
            seat_code: 'A-1',
            status: ttts.ReservationUtil.STATUS_AVAILABLE
        };
        const reservationDoc = <ttts.mongoose.Document>await ttts.Models.Reservation.findOneAndUpdate(
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
                assert.equal(response.body.data.id, reservationDoc.get('id'));
                // テストデータ削除
                await reservationDoc.remove();
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
        // テストデータ作成
        const reservation = {
            performance: 123,
            seat_code: 'A-1',
            status: ttts.ReservationUtil.STATUS_TEMPORARY
        };
        let reservationDoc = <ttts.mongoose.Document>await ttts.Models.Reservation.findOneAndUpdate(
            {
                performance: reservation.performance,
                seat_code: reservation.seat_code
            },
            reservation,
            { new: true, upsert: true }
        ).exec();

        await supertest(app)
            .delete(`/transactions/authorizations/${reservationDoc.get('id')}`)
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .expect(httpStatus.NO_CONTENT)
            .then(async (response) => {
                assert.equal(response.text, '');

                // 予約が解放されていることを確認
                reservationDoc = <ttts.mongoose.Document>await ttts.Models.Reservation.findById(reservationDoc.get('id')).exec();
                assert.equal(reservationDoc.get('status'), ttts.ReservationUtil.STATUS_AVAILABLE);

                // テストデータ削除
                await reservationDoc.remove();
            });
    });

    it('該当予約がなければ404', async () => {
        // テストデータ作成
        const reservation = {
            performance: 123,
            seat_code: 'A-1',
            status: ttts.ReservationUtil.STATUS_AVAILABLE
        };
        const reservationDoc = <ttts.mongoose.Document>await ttts.Models.Reservation.findOneAndUpdate(
            {
                performance: reservation.performance,
                seat_code: reservation.seat_code
            },
            reservation,
            { new: true, upsert: true }
        ).exec();

        await supertest(app)
            .delete(`/transactions/authorizations/${reservationDoc.get('id')}`)
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .expect(httpStatus.NOT_FOUND)
            .then(async (response) => {
                assert.equal(response.body.data, null);

                // テストデータ削除
                await reservationDoc.remove();
            });
    });
});

describe('座席本予約', () => {
    // tslint:disable-next-line:max-func-body-length
    it('ok', async () => {
        // テストデータ作成
        await ttts.Models.Theater.findByIdAndUpdate(
            Resources.theater.id,
            Resources.theater,
            { new: true, upsert: true }
        ).exec();

        await ttts.Models.Screen.findByIdAndUpdate(
            Resources.screen.id,
            Resources.screen,
            { new: true, upsert: true }
        ).exec();

        await ttts.Models.Film.findByIdAndUpdate(
            Resources.film.id,
            Resources.film,
            { new: true, upsert: true }
        ).exec();

        const performanceDoc = <ttts.mongoose.Document>await ttts.Models.Performance.findOneAndUpdate(
            {
                day: Resources.performance.day,
                film: Resources.performance.film,
                screen: Resources.performance.screen,
                start_time: Resources.performance.start_time
            },
            Resources.performance,
            { new: true, upsert: true }
        ).exec();

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

        const reservationDocs = await Promise.all(reservations.map(async (reservation) => {
            return <ttts.mongoose.Document>await ttts.Models.Reservation.findOneAndUpdate(
                {
                    performance: reservation.performance,
                    seat_code: reservation.seat_code
                },
                reservation,
                { new: true, upsert: true }
            ).exec();
        }));

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

        await supertest(app)
            .post('/transactions/confirm')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send(data)
            .expect(httpStatus.OK)
            .then(async (response) => {
                assert(Array.isArray(response.body.data));

                // レスポンスデータの型を確認
                (<any[]>response.body.data).forEach((reservation) => {
                    assert.equal(typeof reservation.id, 'string');
                    assert.equal(typeof reservation.attributes.seat_code, 'string');
                    assert.equal(typeof reservation.attributes.payment_no, 'string');
                    assert.equal(typeof reservation.attributes.qr_str, 'string');
                });

                // 予約が解放されていることを確認
                await Promise.all(reservationDocs.map(async (doc) => {
                    const reservationDoc = <ttts.mongoose.Document>await ttts.Models.Reservation.findById(doc.get('id')).exec();
                    assert.equal(reservationDoc.get('status'), ttts.ReservationUtil.STATUS_RESERVED);
                }));

                // テストデータ削除
                await Promise.all(reservationDocs.map(async (doc) => {
                    await doc.remove();
                }));
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
