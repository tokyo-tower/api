/**
 * 組織ルーター
 * @namespace rouets.organizations
 */

import { Router } from 'express';
const organizationsRouter = Router();

import * as ttts from '@motionpicture/ttts-domain';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

organizationsRouter.use(authentication);

/**
 * 識別子で企業組織を検索
 */
organizationsRouter.get(
    '/corporation/:identifier',
    permitScopes(['organizations', 'organizations.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
            const organization = await organizationRepo.findCorporationByIdentifier(req.params.identifier);
            res.json(organization);
        } catch (error) {
            next(error);
        }
    });

organizationsRouter.get(
    '/movieTheater',
    permitScopes(['organizations', 'organizations.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
            const searchCoinditions: any = {
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100,
                page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1,
                sort: req.query.sort,
                name: req.query.name
            };
            const organizations = await organizationRepo.searchCorporations(searchCoinditions);
            const totalCount = await organizationRepo.countCorporations(searchCoinditions);
            res.set('X-Total-Count', totalCount.toString());
            res.json(organizations);
        } catch (error) {
            next(error);
        }
    }
);

export default organizationsRouter;
