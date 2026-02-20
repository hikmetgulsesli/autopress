import googleTrends from 'google-trends-api';
import { query } from '../db/connection';

// Types
export type RegionCode = 'TR' | 'US' | 'GB' | 'DE' | 'FR' | 'ES' | 'IT' | 'NL' | 'BR' | 'IN' | 'JP' | 'KR' | 'AU' | 'CA' | 'MX' | 'RU' | 'CN' | 'SA' | 'EG' | 'AE';
export type LanguageCode = 'tr' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'nl' | 'pt' | 'hi' | 'ja' | 'ko' | 'ar';

export interface TrendSearchOptions {
  keyword: string;
  region?: RegionCode;
  language?: LanguageCode;
  startTime?: Date;
  endTime?: Date;
  category?: number;
}

export interface InterestOverTimeOptions {
  keyword: string;
  region?: RegionCode;
  language?: LanguageCode;
  startTime?: Date;
  endTime?: Date;
}

export interface TrendingTopic {
  id?: number;
  topic: string;
  score: number;
  source: string;
  language: string;
  region: string;
  checkedAt: Date;
}

export interface InterestDataPoint {
  date: string;
  value: number;
  formattedValue: string;
}

export interface InterestOverTimeResult {
  keyword: string;
  data: InterestDataPoint[];
  average: number;
}

export interface RelatedQuery {
  query: string;
  value: number;
  type: 'top' | 'rising';
}

export interface RelatedQueriesResult {
  keyword: string;
  top: RelatedQuery[];
  rising: RelatedQuery[];
}

export interface DailyTrend {
  title: string;
  traffic: string;
  relatedQueries: string[];
  imageUrl?: string;
  articleUrl?: string;
}

export interface RealTimeTrend {
  title: string;
  relatedQueries: string[];
}

export interface TrendServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Region code mapping for google-trends-api
const regionMapping: Record<RegionCode, string> = {
  TR: 'TR',
  US: 'US',
  GB: 'GB',
  DE: 'DE',
  FR: 'FR',
  ES: 'ES',
  IT: 'IT',
  NL: 'NL',
  BR: 'BR',
  IN: 'IN',
  JP: 'JP',
  KR: 'KR',
  AU: 'AU',
  CA: 'CA',
  MX: 'MX',
  RU: 'RU',
  CN: 'CN',
  SA: 'SA',
  EG: 'EG',
  AE: 'AE',
};

// Language code mapping for google-trends-api
const languageMapping: Record<LanguageCode, string> = {
  tr: 'tr',
  en: 'en',
  de: 'de',
  fr: 'fr',
  es: 'es',
  it: 'it',
  nl: 'nl',
  pt: 'pt',
  hi: 'hi',
  ja: 'ja',
  ko: 'ko',
  ar: 'ar',
};

// Validate region code
const validateRegion = (region?: string): region is RegionCode => {
  if (!region) return false;
  return region in regionMapping;
};

// Validate language code
const validateLanguage = (language?: string): language is LanguageCode => {
  if (!language) return false;
  return language in languageMapping;
};

// Save trend to database
export const saveTrend = async (
  topic: string,
  score: number,
  source: string,
  language: string,
  region: string,
  rawData?: object
): Promise<number> => {
  const result = await query(
    `INSERT INTO trends (topic, score, source, language, region, raw_data, checked_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (topic, language, region) DO UPDATE
     SET score = EXCLUDED.score, raw_data = EXCLUDED.raw_data, checked_at = EXCLUDED.checked_at
     RETURNING id`,
    [topic, score, source, language, region, rawData ? JSON.stringify(rawData) : null]
  );
  return result.rows[0].id;
};

// Search trends for a keyword
export const searchTrends = async (
  options: TrendSearchOptions
): Promise<TrendingTopic[]> => {
  const { keyword, region = 'TR', language = 'tr' } = options;

  // Validate inputs
  if (!keyword || keyword.trim().length === 0) {
    throw {
      code: 'INVALID_KEYWORD',
      message: 'Keyword is required',
    } as TrendServiceError;
  }

  if (!validateRegion(region)) {
    throw {
      code: 'INVALID_REGION',
      message: `Region must be one of: ${Object.keys(regionMapping).join(', ')}`,
    } as TrendServiceError;
  }

  if (!validateLanguage(language)) {
    throw {
      code: 'INVALID_LANGUAGE',
      message: `Language must be one of: ${Object.keys(languageMapping).join(', ')}`,
    } as TrendServiceError;
  }

  try {
    // Get interest over time to calculate a score
    const interestResult = await googleTrends.interestOverTime({
      keyword,
      geo: regionMapping[region],
      hl: languageMapping[language],
      startTime: options.startTime,
      endTime: options.endTime,
      category: options.category,
    });

    const parsedInterest = JSON.parse(interestResult);
    const timelineData = parsedInterest.default?.timelineData || [];
    
    // Calculate average score from timeline data
    const totalValue = timelineData.reduce((sum: number, item: any) => {
      return sum + (parseInt(item.value[0], 10) || 0);
    }, 0);
    const averageScore = timelineData.length > 0 ? Math.round(totalValue / timelineData.length) : 0;

    // Get related queries for additional context
    const relatedResult = await googleTrends.relatedQueries({
      keyword,
      geo: regionMapping[region],
      hl: languageMapping[language],
    }).catch(() => null);

    const rawData = {
      interestOverTime: parsedInterest,
      relatedQueries: relatedResult ? JSON.parse(relatedResult) : null,
    };

    // Save to database
    const trendId = await saveTrend(
      keyword,
      averageScore,
      'google_trends',
      language,
      region,
      rawData
    );

    return [{
      id: trendId,
      topic: keyword,
      score: averageScore,
      source: 'google_trends',
      language,
      region,
      checkedAt: new Date(),
    }];
  } catch (err) {
    const error = err as TrendServiceError;
    if (error.code) {
      throw error;
    }

    // Handle Google Trends API errors
    const apiError = err as { message?: string };
    if (apiError.message?.includes('429') || apiError.message?.includes('rate limit')) {
      throw {
        code: 'RATE_LIMITED',
        message: 'Google Trends API rate limit exceeded. Please try again later.',
      } as TrendServiceError;
    }

    if (apiError.message?.toLowerCase().includes('timeout') || apiError.message?.includes('ECONNRESET')) {
      throw {
        code: 'TIMEOUT',
        message: 'Request to Google Trends timed out. Please try again.',
      } as TrendServiceError;
    }

    throw {
      code: 'API_ERROR',
      message: `Failed to fetch trends: ${apiError.message || 'Unknown error'}`,
    } as TrendServiceError;
  }
};

// Get interest over time for a keyword
export const getInterestOverTime = async (
  options: InterestOverTimeOptions
): Promise<InterestOverTimeResult> => {
  const { keyword, region = 'TR', language = 'tr' } = options;

  // Validate inputs
  if (!keyword || keyword.trim().length === 0) {
    throw {
      code: 'INVALID_KEYWORD',
      message: 'Keyword is required',
    } as TrendServiceError;
  }

  if (!validateRegion(region)) {
    throw {
      code: 'INVALID_REGION',
      message: `Region must be one of: ${Object.keys(regionMapping).join(', ')}`,
    } as TrendServiceError;
  }

  if (!validateLanguage(language)) {
    throw {
      code: 'INVALID_LANGUAGE',
      message: `Language must be one of: ${Object.keys(languageMapping).join(', ')}`,
    } as TrendServiceError;
  }

  try {
    const result = await googleTrends.interestOverTime({
      keyword,
      geo: regionMapping[region],
      hl: languageMapping[language],
      startTime: options.startTime,
      endTime: options.endTime,
    });

    const parsed = JSON.parse(result);
    const timelineData = parsed.default?.timelineData || [];

    const data: InterestDataPoint[] = timelineData.map((item: any) => ({
      date: item.formattedTime || item.formattedAxisTime,
      value: parseInt(item.value[0], 10) || 0,
      formattedValue: item.formattedValue,
    }));

    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    const average = data.length > 0 ? Math.round(totalValue / data.length) : 0;

    // Save trend data to database
    await saveTrend(
      keyword,
      average,
      'google_trends_interest',
      language,
      region,
      parsed
    );

    return {
      keyword,
      data,
      average,
    };
  } catch (err) {
    const error = err as TrendServiceError;
    if (error.code) {
      throw error;
    }

    const apiError = err as { message?: string };
    if (apiError.message?.includes('429') || apiError.message?.includes('rate limit')) {
      throw {
        code: 'RATE_LIMITED',
        message: 'Google Trends API rate limit exceeded. Please try again later.',
      } as TrendServiceError;
    }

    if (apiError.message?.toLowerCase().includes('timeout') || apiError.message?.includes('ECONNRESET')) {
      throw {
        code: 'TIMEOUT',
        message: 'Request to Google Trends timed out. Please try again.',
      } as TrendServiceError;
    }

    throw {
      code: 'API_ERROR',
      message: `Failed to fetch interest over time: ${apiError.message || 'Unknown error'}`,
    } as TrendServiceError;
  }
};

// Get related queries for a keyword
export const getRelatedQueries = async (
  options: TrendSearchOptions
): Promise<RelatedQueriesResult> => {
  const { keyword, region = 'TR', language = 'tr' } = options;

  // Validate inputs
  if (!keyword || keyword.trim().length === 0) {
    throw {
      code: 'INVALID_KEYWORD',
      message: 'Keyword is required',
    } as TrendServiceError;
  }

  if (!validateRegion(region)) {
    throw {
      code: 'INVALID_REGION',
      message: `Region must be one of: ${Object.keys(regionMapping).join(', ')}`,
    } as TrendServiceError;
  }

  if (!validateLanguage(language)) {
    throw {
      code: 'INVALID_LANGUAGE',
      message: `Language must be one of: ${Object.keys(languageMapping).join(', ')}`,
    } as TrendServiceError;
  }

  try {
    const result = await googleTrends.relatedQueries({
      keyword,
      geo: regionMapping[region],
      hl: languageMapping[language],
      startTime: options.startTime,
      endTime: options.endTime,
      category: options.category,
    });

    const parsed = JSON.parse(result);
    const rankedList = parsed.default?.rankedList || [];

    const top: RelatedQuery[] = [];
    const rising: RelatedQuery[] = [];

    rankedList.forEach((list: any) => {
      const rankedKeyword = list.rankedKeyword || [];
      const isRising = list.rankBy === 'RISING';

      rankedKeyword.forEach((item: any) => {
        const query: RelatedQuery = {
          query: item.query,
          value: item.value === 'Breakout' ? 100 : parseInt(item.value, 10) || 0,
          type: isRising ? 'rising' : 'top',
        };

        if (isRising) {
          rising.push(query);
        } else {
          top.push(query);
        }
      });
    });

    return {
      keyword,
      top: top.slice(0, 10),
      rising: rising.slice(0, 10),
    };
  } catch (err) {
    const error = err as TrendServiceError;
    if (error.code) {
      throw error;
    }

    const apiError = err as { message?: string };
    if (apiError.message?.includes('429') || apiError.message?.includes('rate limit')) {
      throw {
        code: 'RATE_LIMITED',
        message: 'Google Trends API rate limit exceeded. Please try again later.',
      } as TrendServiceError;
    }

    throw {
      code: 'API_ERROR',
      message: `Failed to fetch related queries: ${apiError.message || 'Unknown error'}`,
    } as TrendServiceError;
  }
};

// Get daily trends
export const getDailyTrends = async (
  region: RegionCode = 'TR',
  language: LanguageCode = 'tr'
): Promise<DailyTrend[]> => {
  if (!validateRegion(region)) {
    throw {
      code: 'INVALID_REGION',
      message: `Region must be one of: ${Object.keys(regionMapping).join(', ')}`,
    } as TrendServiceError;
  }

  if (!validateLanguage(language)) {
    throw {
      code: 'INVALID_LANGUAGE',
      message: `Language must be one of: ${Object.keys(languageMapping).join(', ')}`,
    } as TrendServiceError;
  }

  try {
    const result = await googleTrends.dailyTrends({
      geo: regionMapping[region],
      hl: languageMapping[language],
    });

    const parsed = JSON.parse(result);
    const trendingSearchesDays = parsed.default?.trendingSearchesDays || [];

    const trends: DailyTrend[] = [];

    trendingSearchesDays.forEach((day: any) => {
      const trendingSearches = day.trendingSearches || [];
      
      trendingSearches.forEach((search: any) => {
        const title = search.title?.query || '';
        const traffic = search.formattedTraffic || '';
        const relatedQueries = (search.relatedQueries || []).map((q: any) => q.query || '');
        const imageUrl = search.image?.imageUrl;
        const articleUrl = search.image?.newsUrl;

        if (title) {
          trends.push({
            title,
            traffic,
            relatedQueries: relatedQueries.slice(0, 5),
            imageUrl,
            articleUrl,
          });

          // Save to database
          saveTrend(
            title,
            parseInt(traffic.replace(/[^0-9]/g, ''), 10) || 0,
            'google_daily_trends',
            language,
            region,
            search
          ).catch(() => {}); // Non-blocking
        }
      });
    });

    return trends.slice(0, 20);
  } catch (err) {
    const error = err as TrendServiceError;
    if (error.code) {
      throw error;
    }

    const apiError = err as { message?: string };
    throw {
      code: 'API_ERROR',
      message: `Failed to fetch daily trends: ${apiError.message || 'Unknown error'}`,
    } as TrendServiceError;
  }
};

// Get real-time trends
export const getRealTimeTrends = async (
  region: RegionCode = 'TR',
  language: LanguageCode = 'tr'
): Promise<RealTimeTrend[]> => {
  if (!validateRegion(region)) {
    throw {
      code: 'INVALID_REGION',
      message: `Region must be one of: ${Object.keys(regionMapping).join(', ')}`,
    } as TrendServiceError;
  }

  if (!validateLanguage(language)) {
    throw {
      code: 'INVALID_LANGUAGE',
      message: `Language must be one of: ${Object.keys(languageMapping).join(', ')}`,
    } as TrendServiceError;
  }

  try {
    const result = await googleTrends.realTimeTrends({
      geo: regionMapping[region],
      hl: languageMapping[language],
    });

    const parsed = JSON.parse(result);
    const storySummaries = parsed.storySummaries?.trendingStories || [];

    const trends: RealTimeTrend[] = [];

    storySummaries.forEach((story: any) => {
      const title = story.title || '';
      const relatedQueries = (story.relatedQueries || []).map((q: any) => q.query || '');

      if (title) {
        trends.push({
          title,
          relatedQueries: relatedQueries.slice(0, 5),
        });

        // Save to database
        saveTrend(
          title,
          100,
          'google_realtime_trends',
          language,
          region,
          story
        ).catch(() => {}); // Non-blocking
      }
    });

    return trends.slice(0, 13);
  } catch (err) {
    const error = err as TrendServiceError;
    if (error.code) {
      throw error;
    }

    const apiError = err as { message?: string };
    throw {
      code: 'API_ERROR',
      message: `Failed to fetch real-time trends: ${apiError.message || 'Unknown error'}`,
    } as TrendServiceError;
  }
};

// Get trending topics list with scores
export const getTrendingTopics = async (
  region: RegionCode = 'TR',
  language: LanguageCode = 'tr',
  limit: number = 50
): Promise<TrendingTopic[]> => {
  try {
    // First try to get from database
    const dbResult = await query(
      `SELECT id, topic, score, source, language, region, checked_at as "checkedAt"
       FROM trends 
       WHERE language = $1 AND region = $2
       ORDER BY score DESC, checked_at DESC
       LIMIT $3`,
      [language, region, limit]
    );

    if (dbResult.rows.length >= 10) {
      return dbResult.rows;
    }

    // If not enough data, fetch from Google Trends
    const dailyTrends = await getDailyTrends(region, language);
    
    // Convert daily trends to trending topics format
    const topics: TrendingTopic[] = dailyTrends.map((trend, index) => ({
      topic: trend.title,
      score: Math.max(50, 100 - index * 5), // Descending score based on position
      source: 'google_daily_trends',
      language,
      region,
      checkedAt: new Date(),
    }));

    return topics.slice(0, limit);
  } catch (err) {
    const error = err as TrendServiceError;
    if (error.code) {
      throw error;
    }

    throw {
      code: 'FETCH_ERROR',
      message: `Failed to fetch trending topics: ${(err as Error).message || 'Unknown error'}`,
    } as TrendServiceError;
  }
};

// Get interest by region
export const getInterestByRegion = async (
  options: TrendSearchOptions
): Promise<Array<{ region: string; value: number }>> => {
  const { keyword, region = 'TR', language = 'tr' } = options;

  if (!keyword || keyword.trim().length === 0) {
    throw {
      code: 'INVALID_KEYWORD',
      message: 'Keyword is required',
    } as TrendServiceError;
  }

  try {
    const result = await googleTrends.interestByRegion({
      keyword,
      geo: regionMapping[region] || region,
      hl: languageMapping[language] || language,
      resolution: 'COUNTRY',
    });

    const parsed = JSON.parse(result);
    const geoMapData = parsed.default?.geoMapData || [];

    return geoMapData.map((item: any) => ({
      region: item.geoName,
      value: item.value[0] || 0,
    }));
  } catch (err) {
    const error = err as TrendServiceError;
    if (error.code) {
      throw error;
    }

    const apiError = err as { message?: string };
    throw {
      code: 'API_ERROR',
      message: `Failed to fetch interest by region: ${apiError.message || 'Unknown error'}`,
    } as TrendServiceError;
  }
};

// Auto-complete suggestions
export const getAutoComplete = async (
  keyword: string,
  language: LanguageCode = 'tr'
): Promise<Array<{ title: string; type: string }>> => {
  if (!keyword || keyword.trim().length === 0) {
    throw {
      code: 'INVALID_KEYWORD',
      message: 'Keyword is required',
    } as TrendServiceError;
  }

  try {
    const result = await googleTrends.autoComplete({
      keyword,
      hl: languageMapping[language],
    });

    const parsed = JSON.parse(result);
    const topics = parsed.default?.topics || [];

    return topics.map((topic: any) => ({
      title: topic.title,
      type: topic.type,
    }));
  } catch (err) {
    const error = err as TrendServiceError;
    if (error.code) {
      throw error;
    }

    const apiError = err as { message?: string };
    throw {
      code: 'API_ERROR',
      message: `Failed to fetch auto-complete suggestions: ${apiError.message || 'Unknown error'}`,
    } as TrendServiceError;
  }
};
