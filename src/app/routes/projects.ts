/**
 * プロジェクトルーター
 */
import * as ttts from '@motionpicture/ttts-domain';
import { Router } from 'express';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const projectsRouter = Router();
projectsRouter.use(authentication);

/**
 * プロジェクト検索
 */
projectsRouter.get(
    '',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const searchCoinditions: any = {
                ...req.query,
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100,
                page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1
            };

            const projectRepo = new ttts.repository.Project(ttts.mongoose.connection);
            const projects = await projectRepo.search(
                searchCoinditions,
                undefined
            );
            const totalCount = await projectRepo.count(searchCoinditions);

            res.set('X-Total-Count', totalCount.toString());
            res.json(projects);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * IDでプロジェクト検索
 */
projectsRouter.get(
    '/:id',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const projectRepo = new ttts.repository.Project(ttts.mongoose.connection);

            const seller = await projectRepo.findById(
                { id: req.params.id },
                undefined
            );

            res.json(seller);
        } catch (error) {
            next(error);
        }
    }
);

export default projectsRouter;
