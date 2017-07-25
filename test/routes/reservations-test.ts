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

import * as app from '../../app/app';
import * as Resources from '../resources';

describe('予約ルーター 入場', () => {
    it('ok', async () => {
        // テストデータ作成
        const reservation = {
            performance: 'xxx',
            seat_code: 'xxx',
            status: ttts.ReservationUtil.STATUS_RESERVED,
            checkins: []
        };
        let reservationDoc = await ttts.Models.Reservation.findOneAndUpdate(reservation, reservation, { new: true, upsert: true }).exec();

        await supertest(app)
            .post(`/reservations/${(<mongoose.Document>reservationDoc).get('id')}/checkins`)
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
            .post('/reservations/5905b0003431b21604da462a/checkins')
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
            .post(`/reservations/${reservationDoc.get('id')}/transfer`)
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
            .post('/reservations/5905b0003431b21604da462a/transfer')
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
            .post('/reservations/5905b0003431b21604da462a/transfer')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
                to: 'hello@motionpicture.jp'
            })
            .expect('Content-Type', /json/)
            .expect(httpStatus.NOT_FOUND);
    });
});

describe('座席本予約取消', () => {
    it('予約が存在しなければ404', async () => {
        await supertest(app)
            .post('/reservations/cancel')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
                performance_day: 'xxx',
                payment_no: 'xxx'
            })
            .expect(httpStatus.NOT_FOUND)
            .then(async (response) => {
                console.error(response.body);
                assert.equal(response.body.data, null);
            });
    });

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

        const paymentNo = await supertest(app)
            .post('/transactions/confirm')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send(data)
            .expect(httpStatus.OK)
            .then((response) => {
                return <string>response.body.data[0].attributes.payment_no;
            });

        // 本予約取消
        await supertest(app)
            .post('/reservations/cancel')
            .set('authorization', `Bearer ${process.env.TTTS_API_ACCESS_TOKEN}`)
            .set('Accept', 'application/json')
            .send({
                performance_day: performanceDoc.get('day'),
                payment_no: paymentNo
            })
            .expect(httpStatus.NO_CONTENT)
            .then(async () => {
                // 予約が解放されていることを確認
                await Promise.all(reservationDocs.map(async (doc) => {
                    const reservationDoc = <ttts.mongoose.Document>await ttts.Models.Reservation.findById(doc.get('id')).exec();
                    assert.equal(reservationDoc.get('status'), ttts.ReservationUtil.STATUS_AVAILABLE);
                }));

                // テストデータ削除
                await Promise.all(reservationDocs.map(async (doc) => {
                    await doc.remove();
                }));
            });
    });
});
