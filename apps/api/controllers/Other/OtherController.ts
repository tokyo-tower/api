import * as express from 'express';

export function environmentVariables(_req: express.Request, res: express.Response): void {
    res.json({
        success: true,
        variables: process.env
    });
}