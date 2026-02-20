declare module 'google-trends-api' {
  interface TrendsOptions {
    keyword: string | string[];
    startTime?: Date;
    endTime?: Date;
    geo?: string | string[];
    hl?: string;
    timezone?: number;
    category?: number;
    property?: 'images' | 'news' | 'youtube' | 'froogle';
    resolution?: 'COUNTRY' | 'REGION' | 'CITY' | 'DMA';
    granularTimeResolution?: boolean;
    agent?: any;
  }

  interface AutoCompleteOptions {
    keyword: string;
    hl?: string;
  }

  interface DailyTrendsOptions {
    geo?: string;
    hl?: string;
  }

  interface RealTimeTrendsOptions {
    geo?: string;
    hl?: string;
  }

  interface InterestByRegionOptions extends TrendsOptions {
    resolution?: 'COUNTRY' | 'REGION' | 'CITY' | 'DMA';
  }

  function interestOverTime(options: TrendsOptions): Promise<string>;
  function interestByRegion(options: InterestByRegionOptions): Promise<string>;
  function relatedQueries(options: TrendsOptions): Promise<string>;
  function relatedTopics(options: TrendsOptions): Promise<string>;
  function dailyTrends(options: DailyTrendsOptions): Promise<string>;
  function realTimeTrends(options: RealTimeTrendsOptions): Promise<string>;
  function autoComplete(options: AutoCompleteOptions): Promise<string>;

  export default {
    interestOverTime,
    interestByRegion,
    relatedQueries,
    relatedTopics,
    dailyTrends,
    realTimeTrends,
    autoComplete,
  };
}
