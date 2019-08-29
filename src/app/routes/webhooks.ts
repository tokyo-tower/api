/**
 * ウェブフックルーター
 */
import * as ttts from '@tokyotower/domain';
import * as express from 'express';
import * as mongoose from 'mongoose';

const webhooksRouter = express.Router();

import { NO_CONTENT } from 'http-status';

webhooksRouter.get(
    '/onPlaceOrder',
    async (req, res, next) => {
        try {
            const order = req.body.data;

            if (order !== undefined && order !== null && typeof order.orderNumber === 'string') {
                const taskRepo = new ttts.repository.Task(mongoose.connection);
                const transactionRepo = new ttts.repository.Transaction(mongoose.connection);

                const transactions = await transactionRepo.search<ttts.factory.transactionType.PlaceOrder>({
                    limit: 1,
                    typeOf: ttts.factory.transactionType.PlaceOrder,
                    result: { order: { orderNumbers: [order.orderNumber] } }
                });
                const transaction = transactions.shift();

                if (transaction !== undefined) {
                    const taskAttribute: ttts.factory.task.createPlaceOrderReport.IAttributes = {
                        name: <any>ttts.factory.taskName.CreatePlaceOrderReport,
                        status: ttts.factory.taskStatus.Ready,
                        runsAt: new Date(), // なるはやで実行
                        remainingNumberOfTries: 10,
                        numberOfTried: 0,
                        executionResults: [],
                        data: {
                            transaction: transaction
                        }
                    };

                    await taskRepo.save(<any>taskAttribute);
                }
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default webhooksRouter;
