// import fs = require('fs-extra');
import log4js = require('log4js');

/**
 * ベースコントローラー
 */
export default class BaseController
{
    /** ロガー */
    public logger: log4js.Logger;

    /**
     * constructor
     * 
     * @param {string} ログディレクトリ
     */
    constructor(logDir: string) {
        console.log(logDir);
        // TDOO ログ出力方法考える
        // fs.mkdirsSync(logDir);
        log4js.configure({
            appenders: [
                {
                    category: 'system',
                    type: 'console',
                    // type: 'dateFile',
                    // filename: `${logDir}/system.log`,
                    // pattern: '-yyyy-MM-dd',
                    // backups: 3
                },
                {
                    type: 'console'
                }
            ],
            levels: {
                system: 'ALL'
            },
            replaceConsole: true
        });
        this.logger = log4js.getLogger('system');
    }

    protected shuffle(array: Array<any>) {
        let m = array.length, t, i;

        while (m) {
            m--;
            i = Math.floor(Math.random() * m);
            t = array[m];
            array[m] = array[i];
            array[i] = t;
        }

        return array;
    }
}
