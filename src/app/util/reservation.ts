import { factory } from '@motionpicture/ttts-domain';

export function tttsReservation2chevre(
    params: factory.reservation.event.IReservation
): factory.reservation.event.IReservation {
    // ツアーナンバーを補完
    if (params.performance_ttts_extension !== undefined
        && params.performance_ttts_extension !== null
        && typeof params.performance_ttts_extension.tour_number === 'string') {
        if (params.reservationFor === undefined || params.reservationFor === null) {
            params.reservationFor = <any>{};
        }
        if (!Array.isArray(params.reservationFor.additionalProperty)) {
            params.reservationFor.additionalProperty = [];
        }
        params.reservationFor.additionalProperty.push({ name: 'tourNumber', value: params.performance_ttts_extension.tour_number });
    }

    // 劇場名を保管
    if (params.theater_name !== undefined
        && params.theater_name !== null) {
        if (params.reservationFor === undefined || params.reservationFor === null) {
            params.reservationFor = <any>{};
        }
        if (params.reservationFor.superEvent === undefined || params.reservationFor.superEvent === null) {
            params.reservationFor.superEvent = <any>{};
        }
        if (params.reservationFor.superEvent.location === undefined || params.reservationFor.superEvent.location === null) {
            params.reservationFor.superEvent.location = <any>{};
        }
        params.reservationFor.superEvent.location.name = params.theater_name;
    }

    // 不要な属性を削除
    delete params.theater;
    delete params.theater_address;
    delete params.theater_name;

    delete params.screen;
    delete params.screen_name;

    delete params.film;
    delete params.film_copyright;
    delete params.film_is_mx4d;
    delete params.film_name;

    delete params.performance_canceled;
    // delete params.performance_day;
    delete params.performance_door_time;
    // delete params.performance_end_date;
    // delete params.performance_end_time;
    delete params.performance_open_time;
    // delete params.performance_start_date;
    // delete params.performance_start_time;

    return params;
}
