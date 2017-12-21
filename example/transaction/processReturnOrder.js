/**
 * 返品取引サンプル
 * @ignore
 */

const moment = require('moment');
const request = require('request-promise-native');

const API_ENDPOINT = 'http://localhost:8080';

async function main() {
    // get token
    const scopes = [
        'https://ttts-api-development.azurewebsites.net/performances.read-only',
        'https://ttts-api-development.azurewebsites.net/transactions'
    ];
    const credentials = await request.post(
        `https://ttts-development.auth.ap-northeast-1.amazoncognito.com/token`,
        {
            auth: {
                user: process.env.TEST_API_CLIENT_ID,
                password: process.env.TEST_API_CLIENT_SECRET,
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            form: {
                scope: scopes.join(' '),
                state: 'state',
                grant_type: 'client_credentials'
            },
            json: true
        }
    );
    console.log('認証情報を取得できました。', credentials.expires_in);

    // 返品確定
    const result = await request.post(
        `${API_ENDPOINT}/transactions/returnOrder/confirm`,
        {
            auth: {
                bearer: credentials.access_token
            },
            json: true,
            body: {
                performance_day: '20171222',
                payment_no: '000406',
                cancellation_fee: 1000
            }
        }
    ).then((body) => body).catch(handleError);
    console.log('返品を受け付けました。', result);
}

function handleError(response) {
    throw new Error(`${response.error.error.code} ${response.error.error.message}`);
};

main().then(() => {
    console.log('success!')
}).catch((err) => {
    console.error(err);
});