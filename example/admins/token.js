/**
 * 管理者トークン発行サンプル
 * @ignore
 */

const moment = require('moment');
const request = require('request-promise-native');

async function main() {
    const result = await request.post(
        'http://localhost:8082/oauth/token',
        {
            json: true,
            body: {
                username: 'motionpicture',
                password: 'Iop@-098'
            }
        }
    ).then((body) => body);
    console.log('result:', result)

    const admin = await request.get(
        'http://localhost:8082/admins/me',
        {
            auth: {
                bearer: result.accessToken
            },
            json: true
        }
    ).then((body) => body);
    console.log('admin:', admin);

    const groups = await request.get(
        'http://localhost:8082/admins/me/groups',
        {
            auth: {
                bearer: result.accessToken
            },
            json: true
        }
    ).then((body) => body);
    console.log('groups:', groups);

    const admins = await request.get(
        'http://localhost:8082/admins',
        {
            auth: {
                bearer: result.accessToken
            },
            json: true,
            qs: {
                group: 'Staff'
            }
        }
    ).then((body) => body);
    console.log('admins:', admins);
}

main().then(() => {
    console.log('success!')
}).catch((err) => {
    console.error(err);
});
