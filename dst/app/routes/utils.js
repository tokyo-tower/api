"use strict";
/**
 * utilsルーター
 * @ignore
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
const ttts = require("@motionpicture/ttts-domain");
const createDebug = require("debug");
const express_1 = require("express");
const moment = require("moment");
const utilsRouter = express_1.Router();
const debug = createDebug('ttts-api:routes:utils');
// チケット情報(descriptionは予約データに持つべき(ticket_description))
const ticketInfos = {
    '004': {
        description: '1'
    },
    '005': {
        description: '1'
    },
    '006': {
        description: '1'
    }
};
// 出力対象区分
const descriptionInfos = {
    1: 'wheelchair'
};
// API・パフォーマンス残席数取得(POS横用)
utilsRouter.get('/performancestatus', (__, res) => __awaiter(this, void 0, void 0, function* () {
    let error = null;
    const data = {};
    try {
        // 今(2017/12/22)のところ業務画面上で ticket_types は不要なので通信量軽減のためここで削る
        // data.data.forEach((performance: any): void => {
        //     delete performance.attributes.ticket_types;
        // });
    }
    catch (e) {
        error = (e && e.message !== undefined) ? e.message : error;
    }
    res.json(error || data);
}));
// api・予約通過確認
// tslint:disable-next-line:max-func-body-length
utilsRouter.get('/pass/list', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // 対象日時セット(引数化の可能性あり)
        const selectType = 'day';
        // 現在時刻取得
        // データがないのでテストで9時
        let now = moment();
        if (req.query.day !== undefined) {
            now = moment(req.query.day, 'YYYYMMDD');
        }
        // 取得対象の日付と開始時刻FromToを取得
        const timeInfo = yield getStartTime(selectType, now);
        // 取得対象のパフォーマンス取得
        const performanceInfos = yield getTargetPerformances(timeInfo);
        // 予約情報取得
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
        const reservations = yield reservationRepo.reservationModel.find({
            performance: { $in: performanceInfos.map((p) => p.id) },
            status: ttts.factory.reservationStatusType.ReservationConfirmed
        }).exec().then((docs) => docs.map((doc) => doc.toObject()));
        // パフォーマンス単位に予約情報をグルーピング
        const dataByPerformance = yield groupingReservationsByPerformance(performanceInfos, reservations);
        const dataCheckins = groupingCheckinsByWhere(dataByPerformance);
        // チェックポイント名称取得
        const ownerRepo = new ttts.repository.Owner(ttts.mongoose.connection);
        const owners = yield ownerRepo.ownerModel.find({ notes: '1' }).exec();
        const checkpointNames = {};
        owners.map((owner) => {
            checkpointNames[owner.get('group')] = owner.get('description');
        });
        // レスポンス編集
        const data = {
            checkpoints: checkpointNames,
            schedules: []
        };
        Object.keys(dataByPerformance).forEach((performanceId) => {
            // パフォーマンス情報セット
            const performance = dataByPerformance[performanceId].performance;
            const reservedNum = dataByPerformance[performanceId].reservations.filter((r) => (r.status === ttts.factory.reservationStatusType.ReservationConfirmed)).length;
            const schedule = {
                performanceId: performanceId,
                start_time: performance.start_time,
                end_time: performance.end_time,
                totalReservedNum: reservedNum,
                concernedReservedArray: [],
                checkpointArray: []
            };
            // 特殊チケット(車椅子)予約情報セット
            const reservedExtra = dataByPerformance[performanceId].reservedExtra;
            Object.keys(descriptionInfos).forEach((description) => {
                // reservedExtraに予約情報があれば予約数セット
                const concernedReservedNum = (reservedExtra.hasOwnProperty(description))
                    ? reservedExtra[description].reservedNum
                    : 0;
                schedule.concernedReservedArray.push({
                    id: description,
                    name: descriptionInfos[description],
                    reservedNum: concernedReservedNum
                });
            });
            // チェックイン情報セット
            const checkins = dataCheckins[performanceId];
            if (Object.keys(checkins).length > 0) {
                Object.keys(checkins).forEach((where) => {
                    // チェックポイントを通過した予約情報の中で特殊チケットの内訳セット
                    const concernedUnarrivedArray = getConcernedUnarrivedArray(schedule.concernedReservedArray, checkins[where]);
                    const checkpoint = {
                        id: where,
                        name: (checkpointNames.hasOwnProperty(where)) ? checkpointNames[where] : where,
                        unarrivedNum: reservedNum - checkins[where].checkins.length,
                        concernedUnarrivedArray: concernedUnarrivedArray
                    };
                    schedule.checkpointArray.push(checkpoint);
                });
            }
            data.schedules.push(schedule);
        });
        res.json(data);
    }
    catch (error) {
        next(new ttts.factory.errors.ServiceUnavailable('予約通過確認情報取得失敗'));
    }
}));
/**
 * 予約通過確認・開始時刻情報取得
 */
function getStartTime(selectType, now) {
    return __awaiter(this, void 0, void 0, function* () {
        const day = now.format('YYYYMMDD');
        // 1日分の時は日付のみセット
        if (selectType === 'day') {
            return {
                startTimeFrom: null,
                startTimeTo: null,
                day: day
            };
        }
        const start = now.format('HHmm');
        // 直近のパフォーマンス(開始時刻)取得
        const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
        const performances = yield performanceRepo.performanceModel.find({
            day: day,
            start_time: { $lte: start }
        }).exec();
        // 開始時刻昇順ソート
        performances.sort((a, b) => (a.get('start_time') > b.get('start_time')) ? 0 : 1);
        // 3パフォーマンス目の開始時刻セット
        const startTimeFrom = performances[0].get('start_time');
        const startDate = moment(performances[0].get('day') + startTimeFrom, 'YYYYMMDDHHmm');
        // tslint:disable-next-line:no-magic-numbers
        const addTime = 15 * (3 - 1);
        const startTimeTo = moment(startDate).add('minutes', addTime).format('HHmm');
        // 現在時刻を含む開始時間を持つパフォーマンスから3パフォーマンス分の開始時刻をセット
        return {
            startTimeFrom: startTimeFrom,
            startTimeTo: startTimeTo,
            day: day
        };
    });
}
/**
 * 予約通過確認・対象パフォーマンス取得
 */
function getTargetPerformances(timeInfo) {
    return __awaiter(this, void 0, void 0, function* () {
        // 来塔日
        const conditions = { day: timeInfo.day };
        // 開始時間
        const startTimeFrom = (timeInfo.startTimeFrom !== null) ? timeInfo.startTimeFrom : null;
        const startTimeTo = (timeInfo.startTimeTo !== null) ? timeInfo.startTimeTo : null;
        if (startTimeFrom !== null || startTimeTo !== null) {
            const conditionsTime = {};
            // 開始時間From
            if (startTimeFrom !== null) {
                conditionsTime.$gte = startTimeFrom;
            }
            // 開始時間To
            if (startTimeTo !== null) {
                conditionsTime.$lte = startTimeTo;
            }
            conditions.start_time = conditionsTime;
        }
        // 対象パフォーマンス取得
        const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
        return performanceRepo.performanceModel.find(conditions).exec().then((docs) => docs.map((doc) => doc.toObject()));
    });
}
/**
 * パフォーマンス単位に予約情報をグルーピング
 */
function groupingReservationsByPerformance(performances, reservations) {
    return __awaiter(this, void 0, void 0, function* () {
        const dataByPerformance = {};
        // 初期セット(DBアクセスがあるので最小限の処理のloopを分割)
        for (const performance of performances) {
            // キーはパフォーマンスID
            if (!dataByPerformance.hasOwnProperty(performance.id)) {
                const ticketTypes = yield getTicketTypes(performance.ticket_type_group);
                const ticketTypesExtra = ticketTypes.filter((t) => t.ttts_extension.category === ttts.factory.ticketTypeCategory.Wheelchair).map((t) => t.id);
                dataByPerformance[performance.id] = {
                    performance: performance,
                    ticketTypesExtra: ticketTypesExtra,
                    reservations: [],
                    reservedNormalNum: 0,
                    reservedExtra: {}
                };
            }
        }
        // 初期セット(DBアクセスがあるので最小限の処理のloopを分割)
        for (const reservation of reservations) {
            // キーはパフォーマンスID
            const keyValue = reservation.performance;
            const performance = performances.find((p) => p.id === reservation.performance);
            if (!dataByPerformance.hasOwnProperty(keyValue)) {
                const ticketTypes = yield getTicketTypes(performance.ticket_type_group);
                const ticketTypesExtra = ticketTypes.filter((t) => t.ttts_extension.category === ttts.factory.ticketTypeCategory.Wheelchair).map((t) => t.id);
                dataByPerformance[performance.id] = {
                    performance: performance,
                    ticketTypesExtra: ticketTypesExtra,
                    reservations: [],
                    reservedNormalNum: 0,
                    reservedExtra: {}
                };
            }
        }
        // 予約情報セット
        reservations.map((reservation) => __awaiter(this, void 0, void 0, function* () {
            // 予約情報
            const keyValue = reservation.performance;
            dataByPerformance[keyValue].reservations.push(reservation);
            // 通常の時は通常予約数をプラス,特殊チケットは特殊チケット情報セット
            const isExtra = dataByPerformance[keyValue].ticketTypesExtra.indexOf(reservation.ticket_type) >= 0;
            if (isExtra) {
                const reservedExtra = dataByPerformance[keyValue].reservedExtra;
                debug('isExtra true.', ticketInfos, reservation.ticket_type);
                const description = ticketInfos[reservation.ticket_type].description;
                if (!reservedExtra.hasOwnProperty(description)) {
                    reservedExtra[description] = {
                        reservedNum: 1
                    };
                }
                else {
                    reservedExtra[description].reservedNum += 1;
                }
            }
            else {
                dataByPerformance[keyValue].reservedNormalNum += 1;
            }
        }));
        return dataByPerformance;
    });
}
/**
 * 予約通過確認・チケットタイプ取得
 */
function getTicketTypes(group) {
    return __awaiter(this, void 0, void 0, function* () {
        // 券種取得
        return ttts.Models.TicketTypeGroup.findOne({ _id: group }).populate('ticket_types').exec().then((doc) => {
            return (doc !== null) ? doc.get('ticket_types') : [];
        });
    });
}
/**
 * 予約通過確認・パフォーマンス+通過地点単位にチェックイン情報をグルーピング
 */
function groupingCheckinsByWhere(dataByPerformance) {
    const dataCheckins = {};
    Object.keys(dataByPerformance).forEach((performanceId) => {
        const dataCheckin = {};
        (dataByPerformance[performanceId].reservations).forEach((reservation) => {
            const tempCheckinWhereArray = [];
            (reservation.checkins).forEach((checkin) => {
                // 同一ポイントでの重複チェックインを除外 ※チェックポイントに現れた物理的な人数を数えるのが目的なのでチェックイン行為の重複はここでは問題にしない
                if (tempCheckinWhereArray.indexOf(checkin.where) !== -1) {
                    return true;
                }
                tempCheckinWhereArray.push(checkin.where);
                if (!dataCheckin.hasOwnProperty(checkin.where)) {
                    dataCheckin[checkin.where] = { checkins: [], arrived: {} };
                }
                // チェックイン数セット
                if (!dataCheckin[checkin.where].arrived.hasOwnProperty(reservation.ticket_type)) {
                    dataCheckin[checkin.where].arrived[reservation.ticket_type] = 1;
                }
                else {
                    dataCheckin[checkin.where].arrived[reservation.ticket_type] += 1;
                }
                // // チェックイン数セット
                dataCheckin[checkin.where].checkins.push(Object.assign({}, checkin, {
                    id: reservation.id,
                    ticket_type: reservation.ticket_type
                }));
                return true;
            });
        });
        dataCheckins[performanceId] = dataCheckin;
    });
    return dataCheckins;
}
/**
 * 予約通過確認・特殊チケットごとの未入場者数取得
 */
function getConcernedUnarrivedArray(concernedReservedArray, checkin) {
    const concernedUnarrivedArray = [];
    // 特殊チケットごとの来場予定者をセット
    concernedReservedArray.forEach((reserve) => {
        concernedUnarrivedArray.push({
            id: reserve.id,
            name: reserve.name,
            unarrivedNum: reserve.reservedNum //初期値は来場予定者数
        });
    });
    // 到着チケットをチェックし、同じdescriptionの予約数からチェックイン数を引く
    for (const tycketType of Object.keys(checkin.arrived)) {
        if (!ticketInfos.hasOwnProperty(tycketType)) {
            continue;
        }
        // チケット情報からdescriptionを取得
        debug('calculating unarrivedNum...', ticketInfos[tycketType]);
        const description = ticketInfos[tycketType].description;
        concernedUnarrivedArray.forEach((unarrive) => {
            if (description === unarrive.id) {
                // 未入場者数 = 来場予定者数 - チェックポイント通過者数
                unarrive.unarrivedNum -= checkin.arrived[tycketType];
            }
        });
    }
    return concernedUnarrivedArray;
}
exports.default = utilsRouter;
