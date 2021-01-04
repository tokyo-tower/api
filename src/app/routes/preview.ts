/**
 * previewルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as ttts from '@tokyotower/domain';
import { Router } from 'express';

const NEW_PREVIEW_URL = process.env.NEW_PREVIEW_URL;

const project = {
    typeOf: <cinerinoapi.factory.chevre.organizationType.Project>cinerinoapi.factory.chevre.organizationType.Project,
    id: <string>process.env.PROJECT_ID
};

const previewRouter = Router();

// 集計データーつきのパフォーマンス検索
previewRouter.get('/performancesWithAggregation', async (req, res, next) => {
    if (typeof NEW_PREVIEW_URL === 'string' && NEW_PREVIEW_URL.length > 0) {
        res.redirect(`${NEW_PREVIEW_URL}/projects/${project.id}${req.originalUrl.replace('/preview', '')}`);

        return;
    }

    next(new ttts.factory.errors.ServiceUnavailable('NEW_PREVIEW_URL undefined'));
});

// 入場場所検索
previewRouter.get('/places/checkinGate', async (req, res, next) => {
    if (typeof NEW_PREVIEW_URL === 'string' && NEW_PREVIEW_URL.length > 0) {
        res.redirect(`${NEW_PREVIEW_URL}/projects/${project.id}${req.originalUrl.replace('/preview', '')}`);

        return;
    }

    next(new ttts.factory.errors.ServiceUnavailable('NEW_PREVIEW_URL undefined'));
});

export default previewRouter;
