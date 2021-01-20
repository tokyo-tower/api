/**
 * ウェブフックルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as ttts from '@tokyotower/domain';
import * as express from 'express';
import * as mongoose from 'mongoose';

import { onActionStatusChanged, onOrderReturned } from '../controllers/webhook';

const webhooksRouter = express.Router();

import { NO_CONTENT } from 'http-status';

/**
 * 注文返金イベント
 * 購入者による手数料あり返品の場合に発生
 */
webhooksRouter.post(
    '/onReturnOrder',
    async (req, res, next) => {
        try {
            const order = <cinerinoapi.factory.order.IOrder | undefined>req.body.data;

            if (typeof order?.orderNumber === 'string') {
                const reportRepo = new ttts.repository.Report(mongoose.connection);

                await ttts.service.report.order.createRefundOrderReport({
                    order: order
                })({ report: reportRepo });
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 注文ステータス変更イベント
 */
webhooksRouter.post(
    '/onOrderStatusChanged',
    async (req, res, next) => {
        try {
            const order = <cinerinoapi.factory.order.IOrder>req.body.data;

            const reportRepo = new ttts.repository.Report(mongoose.connection);
            const performanceRepo = new ttts.repository.Performance(mongoose.connection);

            if (typeof order?.orderNumber === 'string') {
                // 注文から売上レポート作成
                await ttts.service.report.order.createOrderReport({
                    order: order
                })({ report: reportRepo });

                switch (order.orderStatus) {
                    case cinerinoapi.factory.orderStatus.OrderReturned:
                        await onOrderReturned(order)({
                            performance: performanceRepo
                        });

                        break;

                    default:
                }
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 予約使用アクション変更イベント
 */
webhooksRouter.post(
    '/onActionStatusChanged',
    async (req, res, next) => {
        try {
            const action
                // tslint:disable-next-line:max-line-length
                = <ttts.factory.chevre.action.IAction<ttts.factory.chevre.action.IAttributes<ttts.factory.chevre.actionType, any, any>> | undefined>
                req.body.data;

            const reportRepo = new ttts.repository.Report(mongoose.connection);

            if (typeof action?.typeOf === 'string') {
                await onActionStatusChanged(action)({ report: reportRepo });
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default webhooksRouter;
