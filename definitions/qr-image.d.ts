declare module "qr-image" {
    import * as stream from 'stream';

    namespace qrimage {
        export function matrix(text: string, ec_level?: EcLevel, parse_url?: boolean): any[];
        export function image(text: string, options?: Options): stream.Readable;
        export function imageSync(text: string, options?: Options): any;
        export function svgObject(text: string, options?: Options): any;

        type EcLevel = 'L' | 'M' | 'Q' | 'H';

        interface Options {
            ec_level?: EcLevel;
            type?: 'png' | 'svg' | 'pdf' | 'eps';
            size?: number; // (png and svg only) — size of one module in pixels. Default 5 for png and undefined for svg.
            margin?: number; //  — white space around QR image in modules. Default 4 for png and 1 for others.
            customize?: () => {}; // (only png) — function to customize qr bitmap before encoding to PNG.
            parse_url?: boolean; // (experimental, default false) — try to optimize QR-code for URLs.
        }
    } 

    export = qrimage;
}
