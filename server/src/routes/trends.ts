import { Router, Response } from 'express';
import { query } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  searchTrends,
  getInterestOverTime,
  getRelatedQueries,
  getDailyTrends,
  getRealTimeTrends,
  getTrendingTopics,
  getInterestByRegion,
  getAutoComplete,
  RegionCode,
  LanguageCode,
} from '../services/trend.service';

const router = Router();
router.use(authenticate);

// Get trends from database
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { language, limit = '50' } = req.query;
    let sql = 'SELECT * FROM trends';
    const params: any[] = [];
    if (language) { sql += ' WHERE language = $1'; params.push(language); }
    sql += ' ORDER BY score DESC LIMIT $' + (params.length + 1);
    params.push(Number(limit));
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get keywords from database
router.get('/keywords', async (req: AuthRequest, res: Response) => {
  try {
    const { language } = req.query;
    let sql = 'SELECT * FROM keywords';
    const params: any[] = [];
    if (language) { sql += ' WHERE language = $1'; params.push(language); }
    sql += ' ORDER BY trend_score DESC LIMIT 100';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search trends by keyword (database search)
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, region, limit = '50' } = req.query;
    
    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_KEYWORD',
          message: 'Keyword is required',
        },
      });
    }
    
    let sql = 'SELECT * FROM trends WHERE topic ILIKE $1';
    const params: any[] = [`%${keyword.trim()}%`];
    
    if (region && region !== 'all') {
      sql += ' AND region = $2';
      params.push(region);
    }
    
    sql += ` ORDER BY score DESC LIMIT $${params.length + 1}`;
    params.push(Number(limit));
    
    const result = await query(sql, params);
    
    res.json({
      data: result.rows,
      meta: {
        keyword: keyword.trim(),
        total: result.rows.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'SEARCH_ERROR',
        message: err.message,
      },
    });
  }
});

// Search trends for a keyword (Google Trends API)
router.post('/search', async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, region, language, startTime, endTime, category } = req.body;
    
    const result = await searchTrends({
      keyword,
      region: region as RegionCode,
      language: language as LanguageCode,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      category,
    });
    
    res.json({ data: result });
  } catch (err: any) {
    const statusCode = err.code === 'INVALID_KEYWORD' || err.code === 'INVALID_REGION' || err.code === 'INVALID_LANGUAGE' ? 400 : 500;
    res.status(statusCode).json({
      error: {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message,
      },
    });
  }
});

// Get interest over time for a keyword
router.get('/interest-over-time', async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, region, language, startTime, endTime } = req.query;
    
    if (!keyword) {
      return res.status(400).json({
        error: {
          code: 'INVALID_KEYWORD',
          message: 'Keyword is required',
        },
      });
    }
    
    const result = await getInterestOverTime({
      keyword: keyword as string,
      region: region as RegionCode,
      language: language as LanguageCode,
      startTime: startTime ? new Date(startTime as string) : undefined,
      endTime: endTime ? new Date(endTime as string) : undefined,
    });
    
    res.json({ data: result });
  } catch (err: any) {
    const statusCode = err.code === 'INVALID_KEYWORD' || err.code === 'INVALID_REGION' || err.code === 'INVALID_LANGUAGE' ? 400 : 500;
    res.status(statusCode).json({
      error: {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message,
      },
    });
  }
});

// Get related queries for a keyword
router.get('/related-queries', async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, region, language, startTime, endTime, category } = req.query;
    
    if (!keyword) {
      return res.status(400).json({
        error: {
          code: 'INVALID_KEYWORD',
          message: 'Keyword is required',
        },
      });
    }
    
    const result = await getRelatedQueries({
      keyword: keyword as string,
      region: region as RegionCode,
      language: language as LanguageCode,
      startTime: startTime ? new Date(startTime as string) : undefined,
      endTime: endTime ? new Date(endTime as string) : undefined,
      category: category ? Number(category) : undefined,
    });
    
    res.json({ data: result });
  } catch (err: any) {
    const statusCode = err.code === 'INVALID_KEYWORD' || err.code === 'INVALID_REGION' || err.code === 'INVALID_LANGUAGE' ? 400 : 500;
    res.status(statusCode).json({
      error: {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message,
      },
    });
  }
});

// Get daily trends
router.get('/daily', async (req: AuthRequest, res: Response) => {
  try {
    const { region, language } = req.query;
    
    const result = await getDailyTrends(
      (region as RegionCode) || 'TR',
      (language as LanguageCode) || 'tr'
    );
    
    res.json({ data: result });
  } catch (err: any) {
    const statusCode = err.code === 'INVALID_REGION' || err.code === 'INVALID_LANGUAGE' ? 400 : 500;
    res.status(statusCode).json({
      error: {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message,
      },
    });
  }
});

// Get real-time trends
router.get('/realtime', async (req: AuthRequest, res: Response) => {
  try {
    const { region, language } = req.query;
    
    const result = await getRealTimeTrends(
      (region as RegionCode) || 'TR',
      (language as LanguageCode) || 'tr'
    );
    
    res.json({ data: result });
  } catch (err: any) {
    const statusCode = err.code === 'INVALID_REGION' || err.code === 'INVALID_LANGUAGE' ? 400 : 500;
    res.status(statusCode).json({
      error: {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message,
      },
    });
  }
});

// Get trending topics list
router.get('/trending', async (req: AuthRequest, res: Response) => {
  try {
    const { region, language, limit } = req.query;
    
    const result = await getTrendingTopics(
      (region as RegionCode) || 'TR',
      (language as LanguageCode) || 'tr',
      limit ? Number(limit) : 50
    );
    
    res.json({ data: result });
  } catch (err: any) {
    const statusCode = err.code === 'INVALID_REGION' || err.code === 'INVALID_LANGUAGE' ? 400 : 500;
    res.status(statusCode).json({
      error: {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message,
      },
    });
  }
});

// Get interest by region
router.get('/interest-by-region', async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, region, language } = req.query;
    
    if (!keyword) {
      return res.status(400).json({
        error: {
          code: 'INVALID_KEYWORD',
          message: 'Keyword is required',
        },
      });
    }
    
    const result = await getInterestByRegion({
      keyword: keyword as string,
      region: region as RegionCode,
      language: language as LanguageCode,
    });
    
    res.json({ data: result });
  } catch (err: any) {
    const statusCode = err.code === 'INVALID_KEYWORD' ? 400 : 500;
    res.status(statusCode).json({
      error: {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message,
      },
    });
  }
});

// Get auto-complete suggestions
router.get('/autocomplete', async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, language } = req.query;
    
    if (!keyword) {
      return res.status(400).json({
        error: {
          code: 'INVALID_KEYWORD',
          message: 'Keyword is required',
        },
      });
    }
    
    const result = await getAutoComplete(
      keyword as string,
      (language as LanguageCode) || 'tr'
    );
    
    res.json({ data: result });
  } catch (err: any) {
    const statusCode = err.code === 'INVALID_KEYWORD' ? 400 : 500;
    res.status(statusCode).json({
      error: {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message,
      },
    });
  }
});

export default router;
