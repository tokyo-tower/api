"use strict";
class GMOUtil {
    static createShopPassString(shopId, orderId, amount, shopPassword, dateTime) {
        let crypto = require('crypto');
        let md5hash = crypto.createHash('md5');
        md5hash.update(`${shopId}${orderId}${amount}${shopPassword}${dateTime}`, 'utf8');
        return md5hash.digest('hex');
    }
}
GMOUtil.PAY_TYPE_CREDIT = '0';
GMOUtil.PAY_TYPE_SUICA = '1';
GMOUtil.PAY_TYPE_EDY = '2';
GMOUtil.PAY_TYPE_CVS = '3';
GMOUtil.PAY_TYPE_CASH = 'Z';
GMOUtil.STATUS_CVS_UNPROCESSED = 'UNPROCESSED';
GMOUtil.STATUS_CVS_REQSUCCESS = 'REQSUCCESS';
GMOUtil.STATUS_CVS_PAYSUCCESS = 'PAYSUCCESS';
GMOUtil.STATUS_CVS_PAYFAIL = 'PAYFAIL';
GMOUtil.STATUS_CVS_EXPIRED = 'EXPIRED';
GMOUtil.STATUS_CVS_CANCEL = 'CANCEL';
GMOUtil.STATUS_CREDIT_UNPROCESSED = 'UNPROCESSED';
GMOUtil.STATUS_CREDIT_AUTHENTICATED = 'AUTHENTICATED';
GMOUtil.STATUS_CREDIT_CHECK = 'CHECK';
GMOUtil.STATUS_CREDIT_CAPTURE = 'CAPTURE';
GMOUtil.STATUS_CREDIT_AUTH = 'AUTH';
GMOUtil.STATUS_CREDIT_SALES = 'SALES';
GMOUtil.STATUS_CREDIT_VOID = 'VOID';
GMOUtil.STATUS_CREDIT_RETURN = 'RETURN';
GMOUtil.STATUS_CREDIT_RETURNX = 'RETURNX';
GMOUtil.STATUS_CREDIT_SAUTH = 'SAUTH';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOUtil;
