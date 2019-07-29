/**
 * 上映イベントルーター
 */
import * as ttts from '@tokyotower/domain';
import { Router } from 'express';
// tslint:disable-next-line:no-submodule-imports
import { query } from 'express-validator/check';
import * as mongoose from 'mongoose';

import permitScopes from '../../middlewares/permitScopes';
import validator from '../../middlewares/validator';

const redisClient = ttts.redis.createClient({
    host: <string>process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(<string>process.env.REDIS_PORT, 10),
    password: <string>process.env.REDIS_KEY,
    tls: { servername: <string>process.env.REDIS_HOST }
});

const screeningEventRouter = Router();

/**
 * イベント検索
 */
screeningEventRouter.get(
    '',
    permitScopes(['aws.cognito.signin.user.admin', 'events', 'events.read-only']),
    ...[
        query('inSessionFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('inSessionThrough')
            .optional()
            .isISO8601()
            .toDate(),
        query('startFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('startThrough')
            .optional()
            .isISO8601()
            .toDate(),
        query('endFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('endThrough')
            .optional()
            .isISO8601()
            .toDate(),
        query('offers.availableFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('offers.availableThrough')
            .optional()
            .isISO8601()
            .toDate(),
        query('offers.validFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('offers.validThrough')
            .optional()
            .isISO8601()
            .toDate()
    ],
    validator,
    async (req, res, next) => {
        try {
            const conditions = {
                ...req.query,
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100,
                page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1
            };

            const searchResult = await ttts.service.performance.search(conditions)(
                new ttts.repository.Performance(mongoose.connection),
                new ttts.repository.EventWithAggregation(redisClient)
            );

            res.set('X-Total-Count', searchResult.numberOfPerformances.toString())
                .json(searchResult.performances.map(performanceWithAvailability2event));
        } catch (error) {
            next(error);
        }
    }
);

/**
 * IDでイベント検索
 */
screeningEventRouter.get(
    '/:id',
    permitScopes(['aws.cognito.signin.user.admin', 'events', 'events.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const repo = new ttts.repository.Performance(mongoose.connection);
            const performance = await repo.findById(req.params.id);
            const event = performance2event(performance);

            res.json(event);
        } catch (error) {
            next(error);
        }
    }
);

function performance2event(performance: ttts.factory.performance.IPerformanceWithDetails): any {
    return {
        ...performance,
        typeOf: ttts.factory.chevre.eventType.ScreeningEvent,
        additionalProperty: [],
        attendeeCount: 0,
        checkInCount: 0,
        doorTime: performance.doorTime,
        endDate: performance.endDate,
        startDate: performance.startDate,
        eventStatus: ttts.factory.chevre.eventStatusType.EventScheduled,
        name: performance.superEvent.name,
        offers: {
            id: performance.ticket_type_group.id,
            name: performance.ticket_type_group.name,
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
        },
        location: {
            typeOf: ttts.factory.chevre.placeType.ScreeningRoom,
            branchCode: performance.location.branchCode,
            name: performance.location.name
        },
        superEvent: {
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
        },
        workPerformed: {
            identifier: performance.superEvent.id,
            name: performance.superEvent.name.ja,
            typeOf: ttts.factory.chevre.creativeWorkType.Movie
        }
    };
}

function performanceWithAvailability2event(performance: ttts.factory.performance.IPerformanceWithAvailability): any {
    return {
        ...performance,
        typeOf: ttts.factory.chevre.eventType.ScreeningEvent,
        additionalProperty: [],
        attendeeCount: 0,
        checkInCount: 0,
        eventStatus: (performance.onlineSalesStatus === ttts.factory.performance.OnlineSalesStatus.Suspended)
            ? ttts.factory.chevre.eventStatusType.EventCancelled
            : ttts.factory.chevre.eventStatusType.EventScheduled,
        name: {},
        offers: {
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
        },
        location: {
            typeOf: ttts.factory.chevre.placeType.ScreeningRoom,
            branchCode: '',
            name: {}
        },
        superEvent: {
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
        },
        workPerformed: {
            identifier: '',
            name: {},
            typeOf: ttts.factory.chevre.creativeWorkType.Movie
        }
    };
}

/**
 * イベントに対するオファー検索
 */
screeningEventRouter.get(
    '/:id/offers',
    permitScopes(['customer', 'events', 'events.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const projectRepo = new ttts.repository.Project(mongoose.connection);

            const offers = await ttts.service.offer.searchEventOffers({
                project: req.project,
                event: { id: req.params.id }
            })({
                project: projectRepo
            });

            res.json(offers);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * イベントに対する券種オファー検索
 */
screeningEventRouter.get(
    '/:id/offers/ticket',
    permitScopes(['customer', 'events', 'events.read-only']),
    ...[
        // query('seller')
        //     .not()
        //     .isEmpty()
        //     .withMessage((_, __) => 'required'),
        // query('store')
        //     .not()
        //     .isEmpty()
        //     .withMessage((_, __) => 'required')
    ],
    validator,
    async (req, res, next) => {
        try {
            const projectRepo = new ttts.repository.Project(mongoose.connection);
            const sellerRepo = new ttts.repository.Seller(mongoose.connection);

            const offers = await ttts.service.offer.searchEventTicketOffers({
                project: req.project,
                event: { id: req.params.id },
                seller: req.query.seller,
                store: req.query.store
            })({
                project: projectRepo,
                seller: sellerRepo
            });
            res.json(offers);
        } catch (error) {
            next(error);
        }
    }
);

export default screeningEventRouter;
