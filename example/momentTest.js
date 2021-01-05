const moment = require('moment-timezone');

const formated = moment('2021-01-05T08:11:07.454+00:00')
    .tz('Asia/Tokyo', false)
    .format('YYYY/MM/DD HH:mm:ss');

console.log(formated);