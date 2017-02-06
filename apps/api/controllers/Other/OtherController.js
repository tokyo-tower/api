"use strict";
const BaseController_1 = require("../BaseController");
class OtherController extends BaseController_1.default {
    environmentVariables() {
        this.res.json({
            success: true,
            variables: process.env
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OtherController;
