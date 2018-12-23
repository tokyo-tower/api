/**
 * Cognitoユーザープールルーター
 */
import * as ttts from '@motionpicture/ttts-domain';
import { Router } from 'express';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const cognitoIdentityServiceProvider = new ttts.AWS.CognitoIdentityServiceProvider({
    apiVersion: 'latest',
    region: 'ap-northeast-1',
    credentials: new ttts.AWS.Credentials({
        accessKeyId: <string>process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: <string>process.env.AWS_SECRET_ACCESS_KEY
    })
});
const userPoolsRouter = Router();
userPoolsRouter.use(authentication);
userPoolsRouter.get(
    '/:userPoolId',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const userPool = await new Promise<ttts.AWS.CognitoIdentityServiceProvider.UserPoolType>((resolve, reject) => {
                cognitoIdentityServiceProvider.describeUserPool(
                    {
                        UserPoolId: req.params.userPoolId
                    },
                    (err, data) => {
                        if (err instanceof Error) {
                            reject(err);
                        } else {
                            if (data.UserPool === undefined) {
                                reject(new ttts.factory.errors.NotFound('UserPool'));
                            } else {
                                resolve(data.UserPool);
                            }
                        }
                    }
                );
            });
            res.json(userPool);
        } catch (error) {
            next(error);
        }
    }
);
userPoolsRouter.get(
    '/:userPoolId/clients',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const clients = await new Promise<ttts.AWS.CognitoIdentityServiceProvider.UserPoolClientListType>((resolve, reject) => {
                cognitoIdentityServiceProvider.listUserPoolClients(
                    {
                        UserPoolId: req.params.userPoolId,
                        // NextToken?: PaginationKeyType;
                        MaxResults: 60
                    },
                    (err, data) => {
                        if (err instanceof Error) {
                            reject(err);
                        } else {
                            if (data.UserPoolClients === undefined) {
                                reject(new ttts.factory.errors.NotFound('UserPoolClients'));
                            } else {
                                resolve(data.UserPoolClients);
                            }
                        }
                    }
                );
            });
            res.set('X-Total-Count', clients.length.toString());
            res.json(clients);
        } catch (error) {
            next(error);
        }
    }
);
userPoolsRouter.get(
    '/:userPoolId/clients/:clientId',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const client = await new Promise<ttts.AWS.CognitoIdentityServiceProvider.UserPoolClientType>((resolve, reject) => {
                cognitoIdentityServiceProvider.describeUserPoolClient(
                    {
                        ClientId: req.params.clientId,
                        UserPoolId: req.params.userPoolId
                    },
                    (err, data) => {
                        if (err instanceof Error) {
                            reject(err);
                        } else {
                            if (data.UserPoolClient === undefined) {
                                reject(new ttts.factory.errors.NotFound('UserPoolClient'));
                            } else {
                                resolve(data.UserPoolClient);
                            }
                        }
                    }
                );
            });
            res.json(client);
        } catch (error) {
            next(error);
        }
    }
);
export default userPoolsRouter;
