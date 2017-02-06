import BaseController from '../BaseController';

export default class OtherController extends BaseController {
    public environmentVariables(): void {
        this.res.json({
            success: true,
            variables: process.env
        });
    }
}
