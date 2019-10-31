/**
 * 注文返品取引ルーター(POS専用)
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import { Router } from 'express';
import { CREATED } from 'http-status';

const auth = new cinerinoapi.auth.ClientCredentials({
    domain: '',
    clientId: '',
    clientSecret: '',
    scopes: [],
    state: ''
});

const returnOrderTransactionsRouter = Router();

import authentication from '../../middlewares/authentication';
import permitScopes from '../../middlewares/permitScopes';
import validator from '../../middlewares/validator';

returnOrderTransactionsRouter.use(authentication);

/**
 * 上映日と購入番号で返品
 */
returnOrderTransactionsRouter.post(
    '/confirm',
    permitScopes(['pos']),
    (req, _, next) => {
        req.checkBody('performance_day')
            .notEmpty()
            .withMessage('required');
        req.checkBody('payment_no')
            .notEmpty()
            .withMessage('required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const informReservationUrl = `${req.protocol}://${req.hostname}/webhooks/onReservationCancelled`;

            auth.setCredentials({ access_token: req.accessToken });
            const returnOrderService = new cinerinoapi.service.transaction.ReturnOrder4ttts({
                auth: auth,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT
            });
            const returnOrderTransaction = await returnOrderService.confirm({
                performanceDay: req.body.performance_day,
                paymentNo: req.body.payment_no,
                cancellationFee: 0,
                reason: cinerinoapi.factory.transaction.returnOrder.Reason.Customer,
                // informOrderUrl?: string;
                informReservationUrl: informReservationUrl
            });

            res.status(CREATED)
                .json({
                    id: returnOrderTransaction.id
                });
        } catch (error) {
            next(error);
        }
    }
);

export default returnOrderTransactionsRouter;
