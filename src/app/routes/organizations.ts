/**
 * 組織ルーター
 */
import * as ttts from '@tokyotower/domain';
import { Router } from 'express';
import * as mongoose from 'mongoose';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const organizationsRouter = Router();

organizationsRouter.use(authentication);

/**
 * 識別子で企業組織を検索
 * @deprecated Use /sellers/:id
 */
organizationsRouter.get(
    '/corporation/:identifier',
    permitScopes(['organizations', 'organizations.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const sellerRepo = new ttts.repository.Seller(mongoose.connection);
            const doc = await sellerRepo.organizationModel.findOne(
                {
                    identifier: req.params.identifier
                },
                {
                    __v: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    // GMOのセキュアな情報を公開しないように注意
                    'gmoInfo.shopPass': 0,
                    'paymentAccepted.gmoInfo.shopPass': 0
                }
            )
                .exec();
            if (doc === null) {
                throw new ttts.factory.errors.NotFound('Seller');
            }

            res.json(doc.toObject());
        } catch (error) {
            next(error);
        }
    });

export default organizationsRouter;
