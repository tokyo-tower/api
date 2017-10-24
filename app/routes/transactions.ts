/**
 * 取引ルーター
 *
 * @module routes/transactions
 */

import * as GMO from '@motionpicture/gmo-service';
import * as ttts from '@motionpicture/ttts-domain';
import * as express from 'express';
import * as httpStatus from 'http-status';

const transactionRouter = express.Router();

import * as TransactionController from '../controllers/transaction';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

transactionRouter.use(authentication);

/**
 * 座席仮予約
 */
transactionRouter.post(
    '/authorizations',
    permitScopes(['transactions.authorizations']),
    (req, __2, next) => {
        req.checkBody('performance').notEmpty().withMessage('performance is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            await TransactionController.createAuthorization(req.body.performance)
                .then((option) => {
                    option.match({
                        Some: (authorization) => {
                            res.status(httpStatus.OK).json({
                                data: authorization
                            });
                        },
                        None: () => {
                            // 空席がなければ404
                            res.status(httpStatus.NOT_FOUND).json({
                                data: null
                            });
                        }
                    });
                });
        } catch (error) {
            next(error);
        }
    }
);

transactionRouter.delete(
    '/authorizations/:id',
    permitScopes(['transactions.authorizations']),
    validator,
    async (req, res, next) => {
        try {
            await TransactionController.deleteAuthorization(req.params.id)
                .then((option) => {
                    option.match({
                        Some: () => {
                            res.status(httpStatus.NO_CONTENT).end();
                        },
                        None: () => {
                            // 該当予約がなければ404
                            res.status(httpStatus.NOT_FOUND).json({
                                data: null
                            });
                        }
                    });
                });
        } catch (error) {
            next(error);
        }
    }
);

transactionRouter.post(
    '/confirm',
    permitScopes(['transactions']),
    (req, __, next) => {
        req.checkBody('performance').notEmpty().withMessage('performance is required');

        if (!Array.isArray(req.body.authorizations)) {
            req.body.authorizations = [req.body.authorizations];
        }
        req.checkBody('authorizations').notEmpty().withMessage('authorizations is required');
        (<any[]>req.body.authorizations).forEach((__1, index) => {
            req.checkBody(`authorizations.${index}.id`).notEmpty().withMessage('authorizations.id is required');
            req.checkBody(`authorizations.${index}.attributes`).notEmpty().withMessage('authorizations.attributes is required');
            req.checkBody(`authorizations.${index}.attributes.ticket_type`)
                .notEmpty().withMessage('authorizations.attributes.ticket_type is required');
            req.checkBody(`authorizations.${index}.attributes.ticket_type_name`)
                .notEmpty().withMessage('authorizations.attributes.ticket_type_name is required');
            req.checkBody(`authorizations.${index}.attributes.ticket_type_charge`)
                .notEmpty().withMessage('authorizations.attributes.ticket_type_charge is required')
                .isInt().withMessage('authorizations.attributes.ticket_type_charge must be number');
            req.checkBody(`authorizations.${index}.attributes.charge`)
                .notEmpty().withMessage('authorizations.attributes.charge is required')
                .isInt().withMessage('authorizations.attributes.charge must be number');
        });

        const availablePaymentMethod = [
            GMO.utils.util.PayType.Cash,
            GMO.utils.util.PayType.Credit,
            '-'
        ];
        // TO?DO:util系に「-」追加
        req.checkBody('payment_method').notEmpty().withMessage('required')
            .matches(new RegExp(`^(${availablePaymentMethod.join('|')})$`))
            .withMessage(`must be one of '${availablePaymentMethod.join('\', \'')}'`);

        const availablePurchaserGroups = [
            ttts.ReservationUtil.PURCHASER_GROUP_CUSTOMER,
            ttts.ReservationUtil.PURCHASER_GROUP_STAFF,
            ttts.ReservationUtil.PURCHASER_GROUP_WINDOW
        ];
        req.checkBody('purchaser_group').notEmpty().withMessage('required')
            .matches(new RegExp(`^(${availablePurchaserGroups.join('|')})$`))
            .withMessage(`must be one of '${availablePurchaserGroups.join('\', \'')}'`);

        req.checkBody('purchaser_first_name').notEmpty().withMessage('purchaser_first_name is required');
        req.checkBody('purchaser_last_name').notEmpty().withMessage('purchaser_last_name is required');
        req.checkBody('purchaser_email').notEmpty().withMessage('purchaser_email is required');
        req.checkBody('purchaser_tel').notEmpty().withMessage('purchaser_tel is required');
        req.checkBody('purchaser_gender').notEmpty().withMessage('purchaser_gender is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const reservations = await TransactionController.confirm(
                req.body.performance,
                req.body.authorizations,
                req.body.payment_method,
                {
                    group: req.body.purchaser_group,
                    first_name: req.body.purchaser_first_name,
                    last_name: req.body.purchaser_last_name,
                    email: req.body.purchaser_email,
                    tel: req.body.purchaser_tel,
                    gender: req.body.purchaser_gender
                }
            );

            res.status(httpStatus.OK).json({
                data: reservations
            });
        } catch (error) {
            next(error);
        }
    }
);

export default transactionRouter;
