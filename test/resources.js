"use strict";
/**
 * テストリソース
 *
 * @ignore
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.performance = {
    day: '20170712',
    film: '000001',
    screen: '00101',
    start_time: '0900',
    end_time: '0914',
    open_time: '0900',
    ticket_type_group: '01',
    canceled: false,
    theater: '001',
    theater_name: {
        en: 'TokyoTower TOP DECK',
        ja: '東京タワー TOP DECK'
    },
    screen_name: {
        en: 'TokyoTower TOP DECK',
        ja: '東京タワー TOP DECK'
    }
};
exports.film = {
    id: '000001',
    name: {
        en: 'TokyoTower TOP DECK',
        ja: '東京タワー TOP DECK'
    },
    sections: [
        {
            code: '01',
            name: {
                en: '',
                ja: ''
            }
        }
    ],
    minutes: null,
    is_mx4d: false,
    copyright: ''
};
exports.screen = {
    id: '00101',
    theater: '001',
    name: {
        en: 'TokyoTower TOP DECK',
        ja: '東京タワー TOP DECK'
    },
    sections: [
        {
            code: '',
            seats: [
                {
                    code: 'A - 01',
                    grade: {
                        additional_charge: 0,
                        code: '00',
                        name: {
                            en: 'Normal Seat',
                            ja: 'ノーマルシート'
                        }
                    }
                },
                {
                    code: 'A - 02',
                    grade: {
                        additional_charge: 0,
                        code: '00',
                        name: {
                            en: 'Normal Seat',
                            ja: 'ノーマルシート'
                        }
                    }
                },
                {
                    code: 'A - 03',
                    grade: {
                        additional_charge: 0,
                        code: '00',
                        name: {
                            en: 'Normal Seat',
                            ja: 'ノーマルシート'
                        }
                    }
                }
            ]
        }
    ],
    seats_number: 50,
    seats_numbers_by_seat_grade: [
        {
            seats_number: 50,
            seat_grade_code: '00'
        },
        {
            seats_number: 0,
            seat_grade_code: '01'
        }
    ]
};
exports.theater = {
    id: '001',
    name: {
        en: 'TokyoTower TOP DECK',
        ja: '東京タワー TOP DECK'
    },
    address: {
        en: '4 - 2 - 8 Shiba Koen, Minato-ku, Tokyo',
        ja: '東京都港区芝公園４丁目２−８'
    }
};
