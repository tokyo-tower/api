"use strict";
// tslint:disable-next-line:no-suspicious-comment
/**
 * 取引コントローラー
 * TODO 実装する
 * @namespace controllers/transaction
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
function createAuthorization(__) {
    return __awaiter(this, void 0, void 0, function* () {
        return null;
        // 座席をひとつ仮予約
        // const reservationDoc = await ttts.Models.Reservation.findOneAndUpdate(
        //     {
        //         performance: performanceId,
        //         status: ttts.ReservationUtil.STATUS_AVAILABLE
        //     },
        //     {
        //         status: ttts.ReservationUtil.STATUS_TEMPORARY,
        //         expired_at: moment().add(TEMPORARY_RESERVATION_EXPIRES_IN_MINUTES, 'minutes').toDate()
        //     },
        //     {
        //         new: true
        //     }
        // ).exec();
        // if (reservationDoc === null) {
        //     return null;
        // } else {
        //     return {
        //         type: 'authorizations',
        //         id: reservationDoc.get('id'),
        //         attributes: {
        //             expires_at: reservationDoc.get('expired_at')
        //         }
        //     };
        // }
    });
}
exports.createAuthorization = createAuthorization;
function deleteAuthorization(__) {
    return __awaiter(this, void 0, void 0, function* () {
        return null;
        // debug('deleting authorization...', authorizationId);
        // // 座席をひとつ解放する
        // const reservationDoc = await ttts.Models.Reservation.findOneAndUpdate(
        //     {
        //         _id: authorizationId,
        //         status: ttts.ReservationUtil.STATUS_TEMPORARY
        //     },
        //     {
        //         $set: { status: ttts.ReservationUtil.STATUS_AVAILABLE },
        //         $unset: { payment_no: 1, ticket_type: 1, expired_at: 1 }
        //     },
        //     {
        //         new: true
        //     }
        // ).exec();
        // return (reservationDoc === null) ? null : reservationDoc.get('id');
    });
}
exports.deleteAuthorization = deleteAuthorization;
// tslint:disable-next-line:max-func-body-length
function confirm(__1, __2, __3, __4) {
    return __awaiter(this, void 0, void 0, function* () {
        return [];
        // // パフォーマンス詳細情報を取得
        // const performanceDoc = await ttts.Models.Performance.findById(performanceId)
        //     .populate('film')
        //     .populate('screen')
        //     .populate('theater')
        //     .exec();
        // if (performanceDoc === null) {
        //     throw new Error('performance not found');
        // }
        // const paymentNo = await ttts.ReservationUtil.publishPaymentNo(performanceDoc.get('day'));
        // const purchasedAt = moment().toDate();
        // const reservations = authorizations.map((authorization, index) => {
        //     return {
        //         id: authorization.id,
        //         status: ttts.ReservationUtil.STATUS_RESERVED,
        //         payment_seat_index: index,
        //         checkins: [],
        //         ticket_type: authorization.attributes.ticket_type,
        //         ticket_type_name: authorization.attributes.ticket_type_name,
        //         ticket_type_charge: authorization.attributes.ticket_type_charge,
        //         charge: authorization.attributes.charge,
        //         performance: performanceDoc.get('id'),
        //         performance_day: performanceDoc.get('day'),
        //         performance_open_time: performanceDoc.get('open_time'),
        //         performance_start_time: performanceDoc.get('start_time'),
        //         performance_end_time: performanceDoc.get('end_time'),
        //         performance_canceled: performanceDoc.get('canceled'),
        //         theater: performanceDoc.get('theater.id'),
        //         theater_name: performanceDoc.get('theater.name'),
        //         theater_address: performanceDoc.get('theater.address'),
        //         screen: performanceDoc.get('screen.id'),
        //         screen_name: performanceDoc.get('screen.id'),
        //         film: performanceDoc.get('film.id'),
        //         film_name: performanceDoc.get('film.name'),
        //         film_image: performanceDoc.get('film.image'),
        //         film_is_mx4d: performanceDoc.get('film.is_mx4d'),
        //         film_copyright: performanceDoc.get('film.copyright'),
        //         payment_no: paymentNo,
        //         purchaser_group: purchaser.group,
        //         purchaser_last_name: purchaser.last_name,
        //         purchaser_first_name: purchaser.first_name,
        //         purchaser_email: purchaser.email,
        //         purchaser_tel: purchaser.tel,
        //         purchaser_age: purchaser.age,
        //         purchaser_address: '',
        //         purchaser_gender: purchaser.gender,
        //         payment_method: paymentMethod,
        //         watcher_name: '',
        //         watcher_name_updated_at: '',
        //         purchased_at: purchasedAt
        //     };
        // });
        // debug('confirming transaction...');
        // return Promise.all(reservations.map(async (reservation) => {
        //     const newReservationDoc = await ttts.Models.Reservation.findOneAndUpdate(
        //         {
        //             _id: reservation.id,
        //             status: ttts.ReservationUtil.STATUS_TEMPORARY,
        //             performance: performanceId
        //         },
        //         reservation,
        //         { new: true }
        //     ).exec();
        //     if (newReservationDoc === null) {
        //         throw new Error('authorization not found');
        //     }
        //     return newReservationDoc;
        // })).then((newReservationDocs) => {
        //     return newReservationDocs.map((newReservationDoc) => {
        //         return {
        //             type: 'reservation',
        //             id: newReservationDoc.get('id'),
        //             attributes: {
        //                 seat_code: newReservationDoc.get('seat_code'),
        //                 payment_no: newReservationDoc.get('payment_no'),
        //                 qr_str: newReservationDoc.get('qr_str')
        //             }
        //         };
        //     });
        // });
    });
}
exports.confirm = confirm;
