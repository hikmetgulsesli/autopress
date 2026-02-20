import { Router, Response } from 'express';
import Parser from 'rss-parser';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const rssParser = new Parser();

// Common RSS feeds for different regions/languages
const RSS_FEEDS: Record<string, Record<string, string[]>> = {
  tr: {
    news: [
      'https://www.hurriyet.com.tr/rss/anasayfa',
      'https://www.sabah.com.tr/rss/anasayfa.xml',
    ],
    tech: [
      'https://webrazzi.com/feed/',
    ],
  },
  en: {
    news: [
      'https://feeds.bbci.co.uk/news/rss.xml',
      'https://rss.cnn.com/rss/edition.rss',
    ],
    tech: [
      'https://techcrunch.com/feed/',
      'https://www.theverge.com/rss/index.xml',
    ],
  },
};

router.use(authenticate);

// Get RSS feed items
router.get('/feeds', async (req: AuthRequest, res: Response) => {
  try {
    const { language = 'tr', category = 'news', limit = '10' } = req.query;
    
    const feeds = RSS_FEEDS[language as string]?.[category as string] || 
                  RSS_FEEDS['tr']?.['news'] || [];
    
    const allItems: Array<{
      title: string;
      link: string;
      pubDate: string;
      contentSnippet?: string;
      source: string;
    }> = [];

    for (const feedUrl of feeds) {
      try {
        const feed = await rssParser.parseURL(feedUrl);
        const items = feed.items.slice(0, Number(limit)).map(item => ({
          title: item.title || '',
          link: item.link || '',
          pubDate: item.pubDate || item.isoDate || '',
          contentSnippet: item.contentSnippet?.substring(0, 200) || '',
          source: feed.title || feedUrl,
        }));
        allItems.push(...items);
      } catch (err) {
        console.error(`Failed to parse RSS feed ${feedUrl}:`, err);
      }
    }

    // Sort by date and limit
    allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    
    res.json({ 
      data: allItems.slice(0, Number(limit)),
      meta: {
        total: allItems.length,
        language,
        category,
      }
    });
  } catch (err: any) {
    res.status(500).json({ 
      error: {
        code: 'RSS_FETCH_ERROR',
        message: err.message || 'Failed to fetch RSS feeds',
      }
    });
  }
});

// Fetch a custom RSS feed
router.post('/fetch', async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        error: {
          code: 'MISSING_URL',
          message: 'RSS feed URL is required',
        }
      });
    }

    const feed = await rssParser.parseURL(url);
    
    res.json({
      data: {
        title: feed.title || '',
        description: feed.description || '',
        link: feed.link || '',
        items: feed.items.slice(0, 20).map(item => ({
          title: item.title || '',
          link: item.link || '',
          pubDate: item.pubDate || item.isoDate || '',
          contentSnippet: item.contentSnippet?.substring(0, 300) || '',
        })),
      }
    });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'RSS_PARSE_ERROR',
        message: err.message || 'Failed to parse RSS feed',
      }
    });
  }
});

export default router;
