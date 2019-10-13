"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 上映イベントルーター
 */
const ttts = require("@tokyotower/domain");
const express_1 = require("express");
// tslint:disable-next-line:no-submodule-imports
const check_1 = require("express-validator/check");
const mongoose = require("mongoose");
const permitScopes_1 = require("../../middlewares/permitScopes");
const validator_1 = require("../../middlewares/validator");
const redisClient = ttts.redis.createClient({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});
const screeningEventRouter = express_1.Router();
/**
 * イベント検索
 */
screeningEventRouter.get('', permitScopes_1.default(['aws.cognito.signin.user.admin', 'events', 'events.read-only']), ...[
    check_1.query('inSessionFrom')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('inSessionThrough')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('startFrom')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('startThrough')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('endFrom')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('endThrough')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('offers.availableFrom')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('offers.availableThrough')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('offers.validFrom')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('offers.validThrough')
        .optional()
        .isISO8601()
        .toDate()
], validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const conditions = Object.assign({}, req.query, { 
            // tslint:disable-next-line:no-magic-numbers
            limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100, page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1 });
        const searchResult = yield ttts.service.performance.search(conditions)(new ttts.repository.Performance(mongoose.connection), new ttts.repository.EventWithAggregation(redisClient));
        res.set('X-Total-Count', searchResult.numberOfPerformances.toString())
            .json(searchResult.performances.map(performanceWithAvailability2event));
    }
    catch (error) {
        next(error);
    }
}));
/**
 * IDでイベント検索
 */
screeningEventRouter.get('/:id', permitScopes_1.default(['aws.cognito.signin.user.admin', 'events', 'events.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const repo = new ttts.repository.Performance(mongoose.connection);
        const performance = yield repo.findById(req.params.id);
        const event = performance2event(performance);
        res.json(event);
    }
    catch (error) {
        next(error);
    }
}));
function performance2event(performance) {
    return Object.assign({}, performance, { typeOf: ttts.factory.chevre.eventType.ScreeningEvent, additionalProperty: [], attendeeCount: 0, checkInCount: 0, doorTime: performance.doorTime, endDate: performance.endDate, startDate: performance.startDate, eventStatus: ttts.factory.chevre.eventStatusType.EventScheduled, name: performance.superEvent.name, offers: {
            id: (performance.ticket_type_group !== undefined) ? performance.ticket_type_group.id : '',
            name: (performance.ticket_type_group !== undefined) ? performance.ticket_type_group.name : '',
            typeOf: 'Offer',
            priceCurrency: ttts.factory.chevre.priceCurrency.JPY,
            eligibleQuantity: {
                unitCode: 'C62',
                typeOf: 'QuantitativeValue'
            },
            itemOffered: {
                serviceType: {
                    typeOf: 'ServiceType',
                    name: ''
                }
            }
        }, location: {
            typeOf: ttts.factory.chevre.placeType.ScreeningRoom,
            branchCode: performance.location.branchCode,
            name: performance.location.name
        }, superEvent: {
            id: performance.superEvent.id,
            name: performance.superEvent.name,
            alternativeHeadline: performance.superEvent.name,
            location: {
                id: performance.superEvent.location.id,
                branchCode: performance.superEvent.location.branchCode,
                name: performance.superEvent.location.name,
                typeOf: ttts.factory.chevre.placeType.MovieTheater
            },
            videoFormat: [],
            soundFormat: [],
            workPerformed: {
                identifier: performance.superEvent.id,
                name: performance.superEvent.name.ja,
                typeOf: ttts.factory.chevre.creativeWorkType.Movie
            },
            offers: {
                typeOf: 'Offer',
                priceCurrency: ttts.factory.chevre.priceCurrency.JPY
            },
            additionalProperty: [],
            eventStatus: ttts.factory.chevre.eventStatusType.EventScheduled,
            typeOf: ttts.factory.chevre.eventType.ScreeningEventSeries
        }, workPerformed: {
            identifier: performance.superEvent.id,
            name: performance.superEvent.name.ja,
            typeOf: ttts.factory.chevre.creativeWorkType.Movie
        } });
}
function performanceWithAvailability2event(performance) {
    return Object.assign({}, performance, { typeOf: ttts.factory.chevre.eventType.ScreeningEvent, additionalProperty: [], attendeeCount: 0, checkInCount: 0, eventStatus: (performance.onlineSalesStatus === ttts.factory.performance.OnlineSalesStatus.Suspended)
            ? ttts.factory.chevre.eventStatusType.EventCancelled
            : ttts.factory.chevre.eventStatusType.EventScheduled, name: {}, offers: {
            id: '',
            name: {},
            typeOf: 'Offer',
            priceCurrency: ttts.factory.chevre.priceCurrency.JPY,
            eligibleQuantity: {
                unitCode: 'C62',
                typeOf: 'QuantitativeValue'
            },
            itemOffered: {
                serviceType: {
                    typeOf: 'ServiceType',
                    name: ''
                }
            }
        }, location: {
            typeOf: ttts.factory.chevre.placeType.ScreeningRoom,
            branchCode: '',
            name: {}
        }, superEvent: {
            id: '',
            name: {},
            alternativeHeadline: {},
            location: {
                id: '',
                branchCode: '',
                name: {},
                typeOf: ttts.factory.chevre.placeType.MovieTheater
            },
            videoFormat: [],
            soundFormat: [],
            workPerformed: {
                identifier: '',
                name: '',
                typeOf: ttts.factory.chevre.creativeWorkType.Movie
            },
            offers: {
                typeOf: 'Offer',
                priceCurrency: ttts.factory.chevre.priceCurrency.JPY
            },
            additionalProperty: [],
            eventStatus: ttts.factory.chevre.eventStatusType.EventScheduled,
            typeOf: ttts.factory.chevre.eventType.ScreeningEventSeries
        }, workPerformed: {
            identifier: '',
            name: {},
            typeOf: ttts.factory.chevre.creativeWorkType.Movie
        } });
}
/**
 * イベントに対するオファー検索
 */
screeningEventRouter.get('/:id/offers', permitScopes_1.default(['customer', 'events', 'events.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const projectRepo = new ttts.repository.Project(mongoose.connection);
        const offers = yield ttts.service.offer.searchEventOffers({
            project: req.project,
            event: { id: req.params.id }
        })({
            project: projectRepo
        });
        res.json(offers);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * イベントに対する券種オファー検索
 */
screeningEventRouter.get('/:id/offers/ticket', permitScopes_1.default(['customer', 'events', 'events.read-only']), ...[
// query('seller')
//     .not()
//     .isEmpty()
//     .withMessage((_, __) => 'required'),
// query('store')
//     .not()
//     .isEmpty()
//     .withMessage((_, __) => 'required')
], validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const projectRepo = new ttts.repository.Project(mongoose.connection);
        const sellerRepo = new ttts.repository.Seller(mongoose.connection);
        const offers = yield ttts.service.offer.searchEventTicketOffers({
            project: req.project,
            event: { id: req.params.id },
            seller: req.query.seller,
            store: req.query.store
        })({
            project: projectRepo,
            seller: sellerRepo
        });
        res.json(offers);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = screeningEventRouter;
