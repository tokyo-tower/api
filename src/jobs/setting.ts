/**
 * ジョブ設定インターフェース
 */
export interface ISetting {
    /**
     * 作品コード
     */
    film: string;
    /**
     * 劇場コード
     */
    theater: string;
    /**
     * スクリーンコード
     */
    screen: string;
    /**
     * オファーカタログコード
     */
    ticket_type_group: string;
    /**
     * オファーコードリスト
     */
    offerCodes: string[];
    /**
     * イベント間隔
     */
    performance_duration: number;
    /**
     * イベントのない時間帯リスト
     * @example "2215"
     */
    no_performance_times: string[];
}
