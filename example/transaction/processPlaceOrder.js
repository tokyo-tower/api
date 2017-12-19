/**
 * 注文取引フローサンプル
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

    // パフォーマンス検索
    const performances = await request.get(
        `${API_ENDPOINT}/performances`,
        {
            auth: {
                bearer: credentials.access_token
            },
            json: true,
            qs: {
                day: moment().add(1, 'day').format('YYYYMMDD')
            }
        }
    ).then((body) => body.data).catch(handleError);
    console.log('パフォーマンスが見つかりました。', performances.length);

    const performance = performances.find((p) => p.attributes.seat_status > 0);
    if (performances === undefined) {
        throw new Error('予約可能なパフォーマンスが見つかりません。');
    }

    console.log('パフォーマンスを決めています...');
    await wait(5000);
    console.log('取引を開始します... パフォーマンス:', performance.id);

    // 取引開始
    const transaction = await request.post(
        `${API_ENDPOINT}/transactions/placeOrder/start`,
        {
            auth: {
                bearer: credentials.access_token
            },
            json: true,
            body: {
                expires: moment().add(10, 'minutes').toISOString(),
                seller_id: 'TokyoTower',
                purchaser_group: 'Customer'
            }
        }
    ).then((body) => body).catch(handleError);
    console.log('取引が開始されました。', transaction.id);

    // 仮予約
    console.log('券種を選択しています...');
    await wait(5000);
    let ticketType = performance.attributes.ticket_types[0];
    let seatReservationAuthorizeAction = await request.post(
        `${API_ENDPOINT}/transactions/placeOrder/${transaction.id}/actions/authorize/seatReservation`,
        {
            auth: {
                bearer: credentials.access_token
            },
            json: true,
            body: {
                perfomance_id: performance.id,
                offers: [{
                    ticket_type: ticketType.id,
                    watcher_name: ''
                }]
            }
        }
    ).then((body) => body).catch(handleError);
    console.log('仮予約が作成されました。', seatReservationAuthorizeAction.result.tmpReservations[0].payment_no);

    console.log('券種を変更しています...');
    await wait(5000);
    // 仮予約削除
    await request.delete(
        `${API_ENDPOINT}/transactions/placeOrder/${transaction.id}/actions/authorize/seatReservation/${seatReservationAuthorizeAction.id}`,
        {
            auth: {
                bearer: credentials.access_token
            },
            json: true
        }
    ).then((body) => body).catch(handleError);
    console.log('仮予約が削除されました。');

    // 再仮予約
    ticketType = performance.attributes.ticket_types[0];
    seatReservationAuthorizeAction = await request.post(
        `${API_ENDPOINT}/transactions/placeOrder/${transaction.id}/actions/authorize/seatReservation`,
        {
            auth: {
                bearer: credentials.access_token
            },
            json: true,
            body: {
                perfomance_id: performance.id,
                offers: [{
                    ticket_type: ticketType.id,
                    watcher_name: ''
                }]
            }
        }
    ).then((body) => body).catch(handleError);
    console.log('仮予約が作成されました。', seatReservationAuthorizeAction.result.tmpReservations[0].payment_no);

    // 購入者情報登録
    console.log('購入者情報を入力しています...');
    await wait(5000);
    let customerContact = {
        last_name: 'せい',
        first_name: 'めい',
        email: 'hello@motionpicture.jp',
        tel: '09012345678',
        gender: '0'
    };
    customerContact = await request.put(
        `${API_ENDPOINT}/transactions/placeOrder/${transaction.id}/customerContact`,
        {
            auth: {
                bearer: credentials.access_token
            },
            json: true,
            body: customerContact
        }
    ).then((body) => body).catch(handleError);
    console.log('購入者情報が登録されました。', customerContact.tel);

    // 確定
    console.log('最終確認しています...');
    await wait(5000);
    const transactionResult = await request.post(
        `${API_ENDPOINT}/transactions/placeOrder/${transaction.id}/confirm`,
        {
            auth: {
                bearer: credentials.access_token
            },
            json: true,
            body: {
                payment_method: 'Cash'
            }
        }
    ).then((body) => body).catch(handleError);
    console.log('取引確定です。', transactionResult.eventReservations[0].payment_no);
}

function handleError(response) {
    throw new Error(response.error.error.message);
};

async function wait(waitInMilliseconds) {
    return new Promise((resolve) => setTimeout(resolve, waitInMilliseconds));
}

main().then(() => {
    console.log('success!')
}).catch((err) => {
    console.error(err);
});