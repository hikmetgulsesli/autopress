import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchTrends,
  getInterestOverTime,
  getRelatedQueries,
  getDailyTrends,
  getRealTimeTrends,
  getTrendingTopics,
  getInterestByRegion,
  getAutoComplete,
  saveTrend,
  RegionCode,
  LanguageCode,
} from './trend.service';

// Mock the database connection
vi.mock('../db/connection', () => ({
  query: vi.fn(),
}));

// Mock google-trends-api
vi.mock('google-trends-api', () => ({
  default: {
    interestOverTime: vi.fn(),
    relatedQueries: vi.fn(),
    dailyTrends: vi.fn(),
    realTimeTrends: vi.fn(),
    interestByRegion: vi.fn(),
    autoComplete: vi.fn(),
  },
}));

import { query } from '../db/connection';
import googleTrends from 'google-trends-api';

describe('TrendService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Input Validation', () => {
    describe('searchTrends', () => {
      it('should reject empty keyword', async () => {
        await expect(
          searchTrends({
            keyword: '',
            region: 'TR' as RegionCode,
            language: 'tr' as LanguageCode,
          })
        ).rejects.toMatchObject({
          code: 'INVALID_KEYWORD',
          message: 'Keyword is required',
        });
      });

      it('should reject invalid region code', async () => {
        await expect(
          searchTrends({
            keyword: 'test',
            region: 'XX' as RegionCode,
            language: 'tr' as LanguageCode,
          })
        ).rejects.toMatchObject({
          code: 'INVALID_REGION',
        });
      });

      it('should reject invalid language code', async () => {
        await expect(
          searchTrends({
            keyword: 'test',
            region: 'TR' as RegionCode,
            language: 'xx' as LanguageCode,
          })
        ).rejects.toMatchObject({
          code: 'INVALID_LANGUAGE',
        });
      });
    });

    describe('getInterestOverTime', () => {
      it('should reject empty keyword', async () => {
        await expect(
          getInterestOverTime({
            keyword: '',
            region: 'TR' as RegionCode,
            language: 'tr' as LanguageCode,
          })
        ).rejects.toMatchObject({
          code: 'INVALID_KEYWORD',
          message: 'Keyword is required',
        });
      });

      it('should reject invalid region code', async () => {
        await expect(
          getInterestOverTime({
            keyword: 'test',
            region: 'INVALID' as RegionCode,
            language: 'tr' as LanguageCode,
          })
        ).rejects.toMatchObject({
          code: 'INVALID_REGION',
        });
      });

      it('should reject invalid language code', async () => {
        await expect(
          getInterestOverTime({
            keyword: 'test',
            region: 'TR' as RegionCode,
            language: 'invalid' as LanguageCode,
          })
        ).rejects.toMatchObject({
          code: 'INVALID_LANGUAGE',
        });
      });
    });

    describe('getRelatedQueries', () => {
      it('should reject empty keyword', async () => {
        await expect(
          getRelatedQueries({
            keyword: '',
            region: 'TR' as RegionCode,
            language: 'tr' as LanguageCode,
          })
        ).rejects.toMatchObject({
          code: 'INVALID_KEYWORD',
          message: 'Keyword is required',
        });
      });

      it('should reject invalid region code', async () => {
        await expect(
          getRelatedQueries({
            keyword: 'test',
            region: 'YY' as RegionCode,
            language: 'tr' as LanguageCode,
          })
        ).rejects.toMatchObject({
          code: 'INVALID_REGION',
        });
      });

      it('should reject invalid language code', async () => {
        await expect(
          getRelatedQueries({
            keyword: 'test',
            region: 'TR' as RegionCode,
            language: 'yy' as LanguageCode,
          })
        ).rejects.toMatchObject({
          code: 'INVALID_LANGUAGE',
        });
      });
    });

    describe('getDailyTrends', () => {
      it('should reject invalid region code', async () => {
        await expect(
          getDailyTrends('ZZ' as RegionCode, 'tr' as LanguageCode)
        ).rejects.toMatchObject({
          code: 'INVALID_REGION',
        });
      });

      it('should reject invalid language code', async () => {
        await expect(
          getDailyTrends('TR' as RegionCode, 'zz' as LanguageCode)
        ).rejects.toMatchObject({
          code: 'INVALID_LANGUAGE',
        });
      });
    });

    describe('getRealTimeTrends', () => {
      it('should reject invalid region code', async () => {
        await expect(
          getRealTimeTrends('ZZ' as RegionCode, 'tr' as LanguageCode)
        ).rejects.toMatchObject({
          code: 'INVALID_REGION',
        });
      });

      it('should reject invalid language code', async () => {
        await expect(
          getRealTimeTrends('TR' as RegionCode, 'zz' as LanguageCode)
        ).rejects.toMatchObject({
          code: 'INVALID_LANGUAGE',
        });
      });
    });

    describe('getInterestByRegion', () => {
      it('should reject empty keyword', async () => {
        await expect(
          getInterestByRegion({
            keyword: '',
            region: 'TR' as RegionCode,
            language: 'tr' as LanguageCode,
          })
        ).rejects.toMatchObject({
          code: 'INVALID_KEYWORD',
          message: 'Keyword is required',
        });
      });
    });

    describe('getAutoComplete', () => {
      it('should reject empty keyword', async () => {
        await expect(
          getAutoComplete('', 'tr' as LanguageCode)
        ).rejects.toMatchObject({
          code: 'INVALID_KEYWORD',
          message: 'Keyword is required',
        });
      });
    });
  });

  describe('Valid Input Parameters', () => {
    describe('searchTrends', () => {
      it('should accept valid region codes without validation error', async () => {
        const mockInterestResult = JSON.stringify({
          default: {
            timelineData: [
              { time: '1234567890', formattedTime: 'Jan 2024', value: ['50'], formattedValue: '50' },
            ],
          },
        });
        const mockRelatedResult = JSON.stringify({
          default: {
            rankedList: [],
          },
        });

        vi.mocked(googleTrends.interestOverTime).mockResolvedValue(mockInterestResult);
        vi.mocked(googleTrends.relatedQueries).mockResolvedValue(mockRelatedResult);
        vi.mocked(query).mockResolvedValue({ rows: [{ id: 1 }] } as any);

        const result = await searchTrends({
          keyword: 'test',
          region: 'TR' as RegionCode,
          language: 'tr' as LanguageCode,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result[0]).toHaveProperty('topic', 'test');
      });

      it('should accept valid language codes without validation error', async () => {
        const mockInterestResult = JSON.stringify({
          default: {
            timelineData: [
              { time: '1234567890', formattedTime: 'Jan 2024', value: ['75'], formattedValue: '75' },
            ],
          },
        });
        const mockRelatedResult = JSON.stringify({
          default: {
            rankedList: [],
          },
        });

        vi.mocked(googleTrends.interestOverTime).mockResolvedValue(mockInterestResult);
        vi.mocked(googleTrends.relatedQueries).mockResolvedValue(mockRelatedResult);
        vi.mocked(query).mockResolvedValue({ rows: [{ id: 1 }] } as any);

        const result = await searchTrends({
          keyword: 'test',
          region: 'US' as RegionCode,
          language: 'en' as LanguageCode,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('getInterestOverTime', () => {
      it('should accept valid region codes without validation error', async () => {
        const mockResult = JSON.stringify({
          default: {
            timelineData: [
              { time: '1234567890', formattedTime: 'Jan 2024', value: ['60'], formattedValue: '60' },
            ],
          },
        });

        vi.mocked(googleTrends.interestOverTime).mockResolvedValue(mockResult);
        vi.mocked(query).mockResolvedValue({ rows: [{ id: 1 }] } as any);

        const result = await getInterestOverTime({
          keyword: 'test',
          region: 'DE' as RegionCode,
          language: 'de' as LanguageCode,
        });

        expect(result).toBeDefined();
        expect(result).toHaveProperty('keyword', 'test');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('average');
      });

      it('should accept valid language codes without validation error', async () => {
        const mockResult = JSON.stringify({
          default: {
            timelineData: [
              { time: '1234567890', formattedTime: 'Jan 2024', value: ['80'], formattedValue: '80' },
            ],
          },
        });

        vi.mocked(googleTrends.interestOverTime).mockResolvedValue(mockResult);
        vi.mocked(query).mockResolvedValue({ rows: [{ id: 1 }] } as any);

        const result = await getInterestOverTime({
          keyword: 'test',
          region: 'FR' as RegionCode,
          language: 'fr' as LanguageCode,
        });

        expect(result).toBeDefined();
        expect(result).toHaveProperty('keyword', 'test');
      });
    });

    describe('getRelatedQueries', () => {
      it('should accept valid region codes without validation error', async () => {
        const mockResult = JSON.stringify({
          default: {
            rankedList: [
              {
                rankBy: 'TOP',
                rankedKeyword: [
                  { query: 'related query', value: 100 },
                ],
              },
            ],
          },
        });

        vi.mocked(googleTrends.relatedQueries).mockResolvedValue(mockResult);

        const result = await getRelatedQueries({
          keyword: 'test',
          region: 'GB' as RegionCode,
          language: 'en' as LanguageCode,
        });

        expect(result).toBeDefined();
        expect(result).toHaveProperty('keyword', 'test');
        expect(result).toHaveProperty('top');
        expect(result).toHaveProperty('rising');
      });

      it('should accept valid language codes without validation error', async () => {
        const mockResult = JSON.stringify({
          default: {
            rankedList: [
              {
                rankBy: 'RISING',
                rankedKeyword: [
                  { query: 'rising query', value: 'Breakout' },
                ],
              },
            ],
          },
        });

        vi.mocked(googleTrends.relatedQueries).mockResolvedValue(mockResult);

        const result = await getRelatedQueries({
          keyword: 'test',
          region: 'ES' as RegionCode,
          language: 'es' as LanguageCode,
        });

        expect(result).toBeDefined();
        expect(result).toHaveProperty('keyword', 'test');
      });
    });

    describe('getDailyTrends', () => {
      it('should accept valid region codes without validation error', async () => {
        const mockResult = JSON.stringify({
          default: {
            trendingSearchesDays: [
              {
                trendingSearches: [
                  {
                    title: { query: 'Trending Topic' },
                    formattedTraffic: '100K+',
                    relatedQueries: [],
                  },
                ],
              },
            ],
          },
        });

        vi.mocked(googleTrends.dailyTrends).mockResolvedValue(mockResult);
        vi.mocked(query).mockResolvedValue({ rows: [{ id: 1 }] } as any);

        const result = await getDailyTrends('IT' as RegionCode, 'it' as LanguageCode);

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should accept valid language codes without validation error', async () => {
        const mockResult = JSON.stringify({
          default: {
            trendingSearchesDays: [
              {
                trendingSearches: [
                  {
                    title: { query: 'Another Trend' },
                    formattedTraffic: '50K+',
                    relatedQueries: [],
                  },
                ],
              },
            ],
          },
        });

        vi.mocked(googleTrends.dailyTrends).mockResolvedValue(mockResult);
        vi.mocked(query).mockResolvedValue({ rows: [{ id: 1 }] } as any);

        const result = await getDailyTrends('NL' as RegionCode, 'nl' as LanguageCode);

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('getRealTimeTrends', () => {
      it('should accept valid region codes without validation error', async () => {
        const mockResult = JSON.stringify({
          storySummaries: {
            trendingStories: [
              {
                title: 'Real-time Trend',
                relatedQueries: [],
              },
            ],
          },
        });

        vi.mocked(googleTrends.realTimeTrends).mockResolvedValue(mockResult);
        vi.mocked(query).mockResolvedValue({ rows: [{ id: 1 }] } as any);

        const result = await getRealTimeTrends('BR' as RegionCode, 'pt' as LanguageCode);

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should accept valid language codes without validation error', async () => {
        const mockResult = JSON.stringify({
          storySummaries: {
            trendingStories: [
              {
                title: 'Another Real-time Trend',
                relatedQueries: [],
              },
            ],
          },
        });

        vi.mocked(googleTrends.realTimeTrends).mockResolvedValue(mockResult);
        vi.mocked(query).mockResolvedValue({ rows: [{ id: 1 }] } as any);

        const result = await getRealTimeTrends('IN' as RegionCode, 'hi' as LanguageCode);

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('Type Exports', () => {
    it('should export RegionCode type', () => {
      const region: RegionCode = 'TR';
      expect(region).toBe('TR');
    });

    it('should export LanguageCode type', () => {
      const language: LanguageCode = 'tr';
      expect(language).toBe('tr');
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limit errors gracefully', async () => {
      vi.mocked(googleTrends.interestOverTime).mockRejectedValue(new Error('429 rate limit exceeded'));

      await expect(
        getInterestOverTime({
          keyword: 'test',
          region: 'TR' as RegionCode,
          language: 'tr' as LanguageCode,
        })
      ).rejects.toMatchObject({
        code: 'RATE_LIMITED',
        message: 'Google Trends API rate limit exceeded. Please try again later.',
      });
    });

    it('should handle timeout errors gracefully', async () => {
      vi.mocked(googleTrends.interestOverTime).mockRejectedValue(new Error('Request timeout ECONNRESET'));

      await expect(
        getInterestOverTime({
          keyword: 'test',
          region: 'TR' as RegionCode,
          language: 'tr' as LanguageCode,
        })
      ).rejects.toMatchObject({
        code: 'TIMEOUT',
        message: 'Request to Google Trends timed out. Please try again.',
      });
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(googleTrends.interestOverTime).mockRejectedValue(new Error('Network error'));

      await expect(
        getInterestOverTime({
          keyword: 'test',
          region: 'TR' as RegionCode,
          language: 'tr' as LanguageCode,
        })
      ).rejects.toMatchObject({
        code: 'API_ERROR',
        message: expect.stringContaining('Failed to fetch'),
      });
    });
  });

  describe('Data Types', () => {
    it('should have correct TrendingTopic structure', () => {
      const topic = {
        id: 1,
        topic: 'Test Topic',
        score: 85,
        source: 'google_trends',
        language: 'tr',
        region: 'TR',
        checkedAt: new Date(),
      };

      expect(topic).toHaveProperty('topic');
      expect(topic).toHaveProperty('score');
      expect(topic).toHaveProperty('source');
      expect(topic).toHaveProperty('language');
      expect(topic).toHaveProperty('region');
      expect(topic).toHaveProperty('checkedAt');
    });

    it('should have correct InterestOverTimeResult structure', () => {
      const result = {
        keyword: 'test',
        data: [
          { date: '2024-01-01', value: 50, formattedValue: '50' },
          { date: '2024-01-02', value: 75, formattedValue: '75' },
        ],
        average: 62,
      };

      expect(result).toHaveProperty('keyword');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('average');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should have correct RelatedQueriesResult structure', () => {
      const result = {
        keyword: 'test',
        top: [
          { query: 'related 1', value: 100, type: 'top' as const },
          { query: 'related 2', value: 80, type: 'top' as const },
        ],
        rising: [
          { query: 'rising 1', value: 100, type: 'rising' as const },
        ],
      };

      expect(result).toHaveProperty('keyword');
      expect(result).toHaveProperty('top');
      expect(result).toHaveProperty('rising');
      expect(Array.isArray(result.top)).toBe(true);
      expect(Array.isArray(result.rising)).toBe(true);
    });

    it('should have correct DailyTrend structure', () => {
      const trend = {
        title: 'Trending Topic',
        traffic: '100K+',
        relatedQueries: ['query1', 'query2'],
        imageUrl: 'https://example.com/image.jpg',
        articleUrl: 'https://example.com/article',
      };

      expect(trend).toHaveProperty('title');
      expect(trend).toHaveProperty('traffic');
      expect(trend).toHaveProperty('relatedQueries');
      expect(Array.isArray(trend.relatedQueries)).toBe(true);
    });

    it('should have correct RealTimeTrend structure', () => {
      const trend = {
        title: 'Real-time Trend',
        relatedQueries: ['query1', 'query2'],
      };

      expect(trend).toHaveProperty('title');
      expect(trend).toHaveProperty('relatedQueries');
      expect(Array.isArray(trend.relatedQueries)).toBe(true);
    });
  });

  describe('Region and Language Support', () => {
    it('should support all defined regions', () => {
      const regions: RegionCode[] = ['TR', 'US', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BR', 'IN', 'JP', 'KR', 'AU', 'CA', 'MX', 'RU', 'CN', 'SA', 'EG', 'AE'];
      
      expect(regions).toHaveLength(20);
      expect(regions).toContain('TR');
      expect(regions).toContain('US');
      expect(regions).toContain('DE');
    });

    it('should support all defined languages', () => {
      const languages: LanguageCode[] = ['tr', 'en', 'de', 'fr', 'es', 'it', 'nl', 'pt', 'hi', 'ja', 'ko', 'ar'];
      
      expect(languages).toHaveLength(12);
      expect(languages).toContain('tr');
      expect(languages).toContain('en');
      expect(languages).toContain('de');
    });
  });

  describe('saveTrend', () => {
    it('should save trend to database', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [{ id: 123 }] } as any);

      const result = await saveTrend(
        'Test Topic',
        85,
        'google_trends',
        'tr',
        'TR',
        { some: 'data' }
      );

      expect(result).toBe(123);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO trends'),
        expect.arrayContaining(['Test Topic', 85, 'google_trends', 'tr', 'TR', expect.any(String)])
      );
    });

    it('should handle database errors', async () => {
      vi.mocked(query).mockRejectedValue(new Error('Database error'));

      await expect(
        saveTrend('Test', 50, 'source', 'tr', 'TR')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getTrendingTopics', () => {
    it('should return topics from database when available', async () => {
      const mockTopics = [
        { id: 1, topic: 'Topic 1', score: 100, source: 'google', language: 'tr', region: 'TR', checkedAt: new Date() },
        { id: 2, topic: 'Topic 2', score: 90, source: 'google', language: 'tr', region: 'TR', checkedAt: new Date() },
        { id: 3, topic: 'Topic 3', score: 80, source: 'google', language: 'tr', region: 'TR', checkedAt: new Date() },
        { id: 4, topic: 'Topic 4', score: 70, source: 'google', language: 'tr', region: 'TR', checkedAt: new Date() },
        { id: 5, topic: 'Topic 5', score: 60, source: 'google', language: 'tr', region: 'TR', checkedAt: new Date() },
        { id: 6, topic: 'Topic 6', score: 50, source: 'google', language: 'tr', region: 'TR', checkedAt: new Date() },
        { id: 7, topic: 'Topic 7', score: 40, source: 'google', language: 'tr', region: 'TR', checkedAt: new Date() },
        { id: 8, topic: 'Topic 8', score: 30, source: 'google', language: 'tr', region: 'TR', checkedAt: new Date() },
        { id: 9, topic: 'Topic 9', score: 20, source: 'google', language: 'tr', region: 'TR', checkedAt: new Date() },
        { id: 10, topic: 'Topic 10', score: 10, source: 'google', language: 'tr', region: 'TR', checkedAt: new Date() },
      ];

      vi.mocked(query).mockResolvedValue({ rows: mockTopics } as any);

      const result = await getTrendingTopics('TR' as RegionCode, 'tr' as LanguageCode, 50);

      expect(result).toHaveLength(10);
      expect(result[0]).toHaveProperty('topic', 'Topic 1');
    });

    it('should fetch from Google Trends when database has insufficient data', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] } as any);

      const mockDailyTrends = JSON.stringify({
        default: {
          trendingSearchesDays: [
            {
              trendingSearches: [
                { title: { query: 'Trend 1' }, formattedTraffic: '100K+', relatedQueries: [] },
                { title: { query: 'Trend 2' }, formattedTraffic: '50K+', relatedQueries: [] },
              ],
            },
          ],
        },
      });

      vi.mocked(googleTrends.dailyTrends).mockResolvedValue(mockDailyTrends);
      vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)
                     .mockResolvedValue({ rows: [{ id: 1 }] } as any);

      const result = await getTrendingTopics('TR' as RegionCode, 'tr' as LanguageCode, 50);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getInterestByRegion', () => {
    it('should return interest data by region', async () => {
      const mockResult = JSON.stringify({
        default: {
          geoMapData: [
            { geoName: 'Istanbul', value: [100] },
            { geoName: 'Ankara', value: [80] },
          ],
        },
      });

      vi.mocked(googleTrends.interestByRegion).mockResolvedValue(mockResult);

      const result = await getInterestByRegion({
        keyword: 'test',
        region: 'TR' as RegionCode,
        language: 'tr' as LanguageCode,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('region', 'Istanbul');
      expect(result[0]).toHaveProperty('value', 100);
    });
  });

  describe('getAutoComplete', () => {
    it('should return auto-complete suggestions', async () => {
      const mockResult = JSON.stringify({
        default: {
          topics: [
            { title: 'Test Topic', type: 'Topic' },
            { title: 'Test Subject', type: 'Subject' },
          ],
        },
      });

      vi.mocked(googleTrends.autoComplete).mockResolvedValue(mockResult);

      const result = await getAutoComplete('test', 'tr' as LanguageCode);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('title', 'Test Topic');
      expect(result[0]).toHaveProperty('type', 'Topic');
    });
  });
});
