/**
 * previewルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as ttts from '@tokyotower/domain';
import { Router } from 'express';
import * as moment from 'moment-timezone';
import * as mongoose from 'mongoose';

import { search } from '../service/performance';

const project = {
    typeOf: <cinerinoapi.factory.chevre.organizationType.Project>cinerinoapi.factory.chevre.organizationType.Project,
    id: <string>process.env.PROJECT_ID
};

const previewRouter = Router();

const cinerinoAuthClient = new cinerinoapi.auth.ClientCredentials({
    domain: <string>process.env.CINERINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.CINERINO_CLIENT_ID,
    clientSecret: <string>process.env.CINERINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});

// 集計データーつきのパフォーマンス検索
previewRouter.get('/performancesWithAggregation', async (req, res, next) => {
    try {
        const conditions: ttts.factory.performance.ISearchConditions = {
            // tslint:disable-next-line:no-magic-numbers
            limit: (req.query.limit !== undefined) ? Number(req.query.limit) : 100,
            page: (req.query.page !== undefined) ? Math.max(Number(req.query.page), 1) : 1,
            sort: (req.query.sort !== undefined) ? req.query.sort : { startDate: 1 },
            startFrom: (typeof req.query.startFrom === 'string')
                ? moment(req.query.startFrom)
                    .toDate()
                : undefined,
            startThrough: (typeof req.query.startThrough === 'string')
                ? moment(req.query.startThrough)
                    .toDate()
                : undefined
        };

        const performanceRepo = new ttts.repository.Performance(mongoose.connection);

        const searchPerformanceResult = await search(conditions, false)({ performance: performanceRepo });

        res.json(searchPerformanceResult);
    } catch (error) {
        next(new ttts.factory.errors.ServiceUnavailable(error.message));
    }
});

// 入場場所検索
previewRouter.get('/places/checkinGate', async (__, res, next) => {
    try {
        // chevreで取得
        const placeService = new cinerinoapi.service.Place({
            auth: cinerinoAuthClient,
            endpoint: <string>process.env.CINERINO_API_ENDPOINT,
            project: { id: project.id }
        });
        const searchMovieTheatersResult = await placeService.searchMovieTheaters({});
        const movieTheater = searchMovieTheatersResult.data.shift();
        if (movieTheater === undefined) {
            throw new ttts.factory.errors.NotFound('MovieTheater');
        }

        let entranceGates = movieTheater.hasEntranceGate;
        if (!Array.isArray(entranceGates)) {
            entranceGates = [];
        }

        res.json(entranceGates.map((g) => {
            return {
                ...g,
                name: (typeof g.name === 'string') ? g.name : String(g.name?.ja)
            };
        }));
    } catch (error) {
        next(new ttts.factory.errors.ServiceUnavailable(error.message));
    }
});

export default previewRouter;
