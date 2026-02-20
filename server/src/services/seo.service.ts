import * as cheerio from 'cheerio';

// Types
export interface SEOAnalysisInput {
  title: string;
  metaDescription: string;
  content: string;
  url?: string;
  keywords?: string[];
}

export interface SEOScoreBreakdown {
  title: number;
  metaDescription: number;
  keywordDensity: number;
  headings: number;
  imageAltTags: number;
  internalLinks: number;
  externalLinks: number;
  readability: number;
}

export interface SEOAnalysisResult {
  overallScore: number;
  breakdown: SEOScoreBreakdown;
  details: {
    title: {
      length: number;
      optimal: boolean;
      message: string;
    };
    metaDescription: {
      length: number;
      optimal: boolean;
      message: string;
    };
    keywordDensity: {
      density: number;
      optimal: boolean;
      message: string;
      topKeywords: Array<{ word: string; count: number; density: number }>;
    };
    headings: {
      h2Count: number;
      h3Count: number;
      hasH2: boolean;
      hasH3: boolean;
      message: string;
    };
    images: {
      total: number;
      withAlt: number;
      withoutAlt: number;
      altCoverage: number;
      message: string;
    };
    links: {
      internal: number;
      external: number;
      total: number;
      message: string;
    };
    readability: {
      fleschScore: number;
      grade: string;
      wordCount: number;
      sentenceCount: number;
      avgWordsPerSentence: number;
      message: string;
    };
  };
  recommendations: string[];
}

// Constants for scoring
const TITLE_OPTIMAL_MIN = 50;
const TITLE_OPTIMAL_MAX = 60;
const META_DESC_OPTIMAL_MIN = 150;
const META_DESC_OPTIMAL_MAX = 160;
const KEYWORD_DENSITY_OPTIMAL_MIN = 1;
const KEYWORD_DENSITY_OPTIMAL_MAX = 3;

// Weight distribution for overall score
const WEIGHTS = {
  title: 15,
  metaDescription: 15,
  keywordDensity: 15,
  headings: 10,
  imageAltTags: 10,
  internalLinks: 10,
  externalLinks: 10,
  readability: 15,
};

/**
 * Calculate title score (0-100)
 * Optimal: 50-60 characters
 */
const calculateTitleScore = (title: string): { score: number; details: { length: number; optimal: boolean; message: string } } => {
  const length = title.length;
  let score = 0;
  let optimal = false;
  let message = '';

  if (length >= TITLE_OPTIMAL_MIN && length <= TITLE_OPTIMAL_MAX) {
    score = 100;
    optimal = true;
    message = `Perfect! Title length (${length} chars) is optimal for SEO.`;
  } else if (length >= 30 && length < TITLE_OPTIMAL_MIN) {
    score = 70 + (length - 30) * 1;
    message = `Title is a bit short (${length} chars). Aim for ${TITLE_OPTIMAL_MIN}-${TITLE_OPTIMAL_MAX} characters.`;
  } else if (length > TITLE_OPTIMAL_MAX && length <= 70) {
    score = 70 - (length - TITLE_OPTIMAL_MAX) * 2;
    message = `Title is slightly long (${length} chars). Keep it under ${TITLE_OPTIMAL_MAX} characters.`;
  } else if (length < 30) {
    score = Math.max(0, length * 2);
    message = `Title is too short (${length} chars). Minimum recommended is 30 characters.`;
  } else {
    score = Math.max(0, 70 - (length - 70) * 1.5);
    message = `Title is too long (${length} chars). Search engines may truncate it.`;
  }

  return { score: Math.round(score), details: { length, optimal, message } };
};

/**
 * Calculate meta description score (0-100)
 * Optimal: 150-160 characters
 */
const calculateMetaDescriptionScore = (metaDescription: string): { score: number; details: { length: number; optimal: boolean; message: string } } => {
  const length = metaDescription.length;
  let score = 0;
  let optimal = false;
  let message = '';

  if (length >= META_DESC_OPTIMAL_MIN && length <= META_DESC_OPTIMAL_MAX) {
    score = 100;
    optimal = true;
    message = `Perfect! Meta description (${length} chars) is optimal for SEO.`;
  } else if (length >= 120 && length < META_DESC_OPTIMAL_MIN) {
    score = 75 + (length - 120) * 0.83;
    message = `Meta description is good but could be longer (${length} chars). Aim for ${META_DESC_OPTIMAL_MIN}-${META_DESC_OPTIMAL_MAX}.`;
  } else if (length > META_DESC_OPTIMAL_MAX && length <= 170) {
    score = 85 - (length - META_DESC_OPTIMAL_MAX) * 1.5;
    message = `Meta description is slightly long (${length} chars). Keep it under ${META_DESC_OPTIMAL_MAX}.`;
  } else if (length < 120) {
    score = Math.max(0, length * 0.6);
    message = `Meta description is too short (${length} chars). Minimum recommended is 120 characters.`;
  } else {
    score = Math.max(0, 60 - (length - 170) * 0.5);
    message = `Meta description is too long (${length} chars). Search engines will truncate it.`;
  }

  return { score: Math.round(score), details: { length, optimal, message } };
};

/**
 * Calculate keyword density for specified keywords
 * Optimal: 1-3%
 */
const calculateKeywordDensity = (
  content: string,
  keywords: string[] = []
): {
  score: number;
  details: {
    density: number;
    optimal: boolean;
    message: string;
    topKeywords: Array<{ word: string; count: number; density: number }>;
  };
} => {
  const textContent = content.toLowerCase().replace(/<[^>]*>/g, ' ');
  const words = textContent.match(/\b[a-z]+\b/g) || [];
  const totalWords = words.length;

  if (totalWords === 0) {
    return {
      score: 0,
      details: {
        density: 0,
        optimal: false,
        message: 'No content to analyze.',
        topKeywords: [],
      },
    };
  }

  // Calculate density for provided keywords
  const keywordCounts: Record<string, number> = {};
  let totalKeywordOccurrences = 0;

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const count = (textContent.match(regex) || []).length;
    if (count > 0) {
      keywordCounts[keywordLower] = count;
      totalKeywordOccurrences += count;
    }
  }

  // If no keywords provided, find top keywords automatically
  const topKeywords: Array<{ word: string; count: number; density: number }> = [];

  if (keywords.length === 0) {
    // Common stop words to exclude
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
      'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'under', 'and', 'but', 'or', 'yet', 'so', 'if',
      'because', 'although', 'though', 'while', 'where', 'when', 'that',
      'which', 'who', 'whom', 'whose', 'what', 'this', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
      'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'mine',
      'yours', 'hers', 'ours', 'theirs', 'myself', 'yourself', 'himself',
      'herself', 'itself', 'ourselves', 'yourselves', 'themselves',
    ]);

    const wordFreq: Record<string, number> = {};
    for (const word of words) {
      if (!stopWords.has(word) && word.length > 3) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }

    const sortedWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [word, count] of sortedWords) {
      topKeywords.push({
        word,
        count,
        density: parseFloat(((count / totalWords) * 100).toFixed(2)),
      });
    }

    if (topKeywords.length > 0) {
      totalKeywordOccurrences = topKeywords[0].count;
    }
  } else {
    for (const [word, count] of Object.entries(keywordCounts)) {
      topKeywords.push({
        word,
        count,
        density: parseFloat(((count / totalWords) * 100).toFixed(2)),
      });
    }
    topKeywords.sort((a, b) => b.count - a.count);
  }

  const density = totalWords > 0 ? (totalKeywordOccurrences / totalWords) * 100 : 0;

  let score = 0;
  let optimal = false;
  let message = '';

  if (density >= KEYWORD_DENSITY_OPTIMAL_MIN && density <= KEYWORD_DENSITY_OPTIMAL_MAX) {
    score = 100;
    optimal = true;
    message = `Great keyword density (${density.toFixed(1)}%). Optimal range is ${KEYWORD_DENSITY_OPTIMAL_MIN}-${KEYWORD_DENSITY_OPTIMAL_MAX}%.`;
  } else if (density < KEYWORD_DENSITY_OPTIMAL_MIN) {
    score = Math.max(0, (density / KEYWORD_DENSITY_OPTIMAL_MIN) * 80);
    message = `Keyword density is low (${density.toFixed(1)}%). Try to naturally include more keywords.`;
  } else if (density > KEYWORD_DENSITY_OPTIMAL_MAX && density <= 5) {
    score = Math.max(0, 100 - (density - KEYWORD_DENSITY_OPTIMAL_MAX) * 15);
    message = `Keyword density is slightly high (${density.toFixed(1)}%). Avoid keyword stuffing.`;
  } else {
    score = Math.max(0, 55 - (density - 5) * 5);
    message = `Keyword density is too high (${density.toFixed(1)}%). This may be seen as keyword stuffing.`;
  }

  return {
    score: Math.round(score),
    details: {
      density: parseFloat(density.toFixed(2)),
      optimal,
      message,
      topKeywords,
    },
  };
};

/**
 * Calculate heading structure score (0-100)
 */
const calculateHeadingScore = (content: string): {
  score: number;
  details: { h2Count: number; h3Count: number; hasH2: boolean; hasH3: boolean; message: string };
} => {
  const $ = cheerio.load(content);
  const h2Count = $('h2').length;
  const h3Count = $('h3').length;
  const hasH2 = h2Count > 0;
  const hasH3 = h3Count > 0;

  let score = 0;
  let message = '';

  if (hasH2 && hasH3) {
    if (h2Count >= 2 && h3Count >= 2) {
      score = 100;
      message = `Excellent heading structure with ${h2Count} H2 and ${h3Count} H3 tags.`;
    } else {
      score = 85;
      message = `Good heading structure. Consider adding more H2/H3 tags for better organization.`;
    }
  } else if (hasH2) {
    score = 70;
    message = `Good use of H2 tags (${h2Count}), but consider adding H3 tags for subsections.`;
  } else if (hasH3) {
    score = 50;
    message = `H3 tags found but no H2 tags. Use H2 for main sections first.`;
  } else {
    score = 0;
    message = 'No H2 or H3 headings found. Add headings to improve structure and SEO.';
  }

  return { score, details: { h2Count, h3Count, hasH2, hasH3, message } };
};

/**
 * Calculate image alt tag score (0-100)
 */
const calculateImageAltScore = (content: string): {
  score: number;
  details: { total: number; withAlt: number; withoutAlt: number; altCoverage: number; message: string };
} => {
  const $ = cheerio.load(content);
  const images = $('img');
  const total = images.length;
  let withAlt = 0;

  images.each((_, img) => {
    const alt = $(img).attr('alt');
    if (alt && alt.trim().length > 0) {
      withAlt++;
    }
  });

  const withoutAlt = total - withAlt;
  const altCoverage = total > 0 ? (withAlt / total) * 100 : 100;

  let score = 0;
  let message = '';

  if (total === 0) {
    score = 100;
    message = 'No images in content.';
  } else if (altCoverage === 100) {
    score = 100;
    message = `Perfect! All ${total} images have alt tags.`;
  } else if (altCoverage >= 80) {
    score = 80 + (altCoverage - 80) * 1;
    message = `Good! ${withAlt}/${total} images have alt tags. Add alt text to the remaining ${withoutAlt}.`;
  } else if (altCoverage >= 50) {
    score = 50 + (altCoverage - 50) * 1;
    message = `${withAlt}/${total} images have alt tags. Add alt text to all images for better SEO and accessibility.`;
  } else {
    score = altCoverage;
    message = `Only ${withAlt}/${total} images have alt tags. This hurts SEO and accessibility.`;
  }

  return {
    score: Math.round(score),
    details: { total, withAlt, withoutAlt, altCoverage: parseFloat(altCoverage.toFixed(1)), message },
  };
};

/**
 * Calculate link score (0-100) - combines internal and external links
 */
const calculateLinkScore = (
  content: string,
  baseUrl?: string
): {
  score: number;
  details: { internal: number; external: number; total: number; message: string };
} => {
  const $ = cheerio.load(content);
  const links = $('a[href]');
  let internal = 0;
  let external = 0;

  links.each((_, link) => {
    const href = $(link).attr('href') || '';
    
    if (href.startsWith('http://') || href.startsWith('https://')) {
      if (baseUrl) {
        const baseDomain = new URL(baseUrl).hostname;
        const linkDomain = new URL(href).hostname;
        if (baseDomain === linkDomain) {
          internal++;
        } else {
          external++;
        }
      } else {
        external++;
      }
    } else if (href.startsWith('/') || href.startsWith('#')) {
      internal++;
    } else if (href && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      internal++;
    }
  });

  const total = internal + external;

  // Score based on having a good mix of links
  let score = 0;
  let message = '';

  if (total === 0) {
    score = 30;
    message = 'No links found. Add internal and external links to improve SEO.';
  } else if (internal >= 2 && external >= 1) {
    score = 100;
    message = `Excellent! ${internal} internal and ${external} external links.`;
  } else if (internal >= 1 && external >= 1) {
    score = 85;
    message = `Good mix of ${internal} internal and ${external} external links.`;
  } else if (internal >= 3) {
    score = 75;
    message = `${internal} internal links found. Consider adding some external links to authoritative sources.`;
  } else if (external >= 2) {
    score = 60;
    message = `${external} external links found. Add more internal links to improve site structure.`;
  } else {
    score = 50;
    message = `Only ${total} link(s) found. Add more links for better SEO.`;
  }

  return { score, details: { internal, external, total, message } };
};

/**
 * Calculate Flesch Reading Ease score
 * Formula: 206.835 - (1.015 × ASL) - (84.6 × ASW)
 * ASL = Average Sentence Length (words/sentences)
 * ASW = Average Syllables per Word (syllables/words)
 */
const calculateFleschScore = (text: string): number => {
  // Clean text
  const cleanText = text.replace(/<[^>]*>/g, ' ').trim();
  
  // Count sentences (approximated by periods, exclamation marks, question marks)
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length || 1;

  // Count words
  const words = cleanText.match(/\b[a-zA-Z]+\b/g) || [];
  const wordCount = words.length || 1;

  // Count syllables (approximation)
  const countSyllables = (word: string): number => {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    
    const syllableMatches = word.match(/[aeiouy]{1,2}/g);
    return syllableMatches ? syllableMatches.length : 1;
  };

  const syllableCount = words.reduce((sum, word) => sum + countSyllables(word), 0);

  // Calculate Flesch Reading Ease
  const ASL = wordCount / sentenceCount;
  const ASW = syllableCount / wordCount;

  const fleschScore = 206.835 - (1.015 * ASL) - (84.6 * ASW);

  return Math.max(0, Math.min(100, fleschScore));
};

/**
 * Get readability grade from Flesch score
 */
const getReadabilityGrade = (score: number): string => {
  if (score >= 90) return 'Very Easy';
  if (score >= 80) return 'Easy';
  if (score >= 70) return 'Fairly Easy';
  if (score >= 60) return 'Standard';
  if (score >= 50) return 'Fairly Difficult';
  if (score >= 30) return 'Difficult';
  return 'Very Difficult';
};

/**
 * Calculate readability score (0-100)
 */
const calculateReadabilityScore = (content: string): {
  score: number;
  details: {
    fleschScore: number;
    grade: string;
    wordCount: number;
    sentenceCount: number;
    avgWordsPerSentence: number;
    message: string;
  };
} => {
  const cleanText = content.replace(/<[^>]*>/g, ' ').trim();
  
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;
  
  const words = cleanText.match(/\b[a-zA-Z]+\b/g) || [];
  const wordCount = words.length;
  
  const fleschScore = calculateFleschScore(content);
  const grade = getReadabilityGrade(fleschScore);
  const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;

  // Score based on Flesch Reading Ease (60-70 is optimal for general content)
  let score = 0;
  let message = '';

  if (fleschScore >= 60 && fleschScore <= 70) {
    score = 100;
    message = `Excellent readability (${grade}). Score: ${fleschScore.toFixed(1)}. Optimal for general audiences.`;
  } else if (fleschScore >= 50 && fleschScore < 60) {
    score = 90;
    message = `Good readability (${grade}). Score: ${fleschScore.toFixed(1)}. Slightly more complex, but acceptable.`;
  } else if (fleschScore > 70 && fleschScore <= 80) {
    score = 90;
    message = `Good readability (${grade}). Score: ${fleschScore.toFixed(1)}. Easy to read, great for broad audiences.`;
  } else if (fleschScore >= 30 && fleschScore < 50) {
    score = 70;
    message = `Moderate readability (${grade}). Score: ${fleschScore.toFixed(1)}. Consider simplifying for broader appeal.`;
  } else if (fleschScore > 80) {
    score = 80;
    message = `Very easy readability (${grade}). Score: ${fleschScore.toFixed(1)}. May be too simple for some topics.`;
  } else {
    score = 50;
    message = `Difficult readability (${grade}). Score: ${fleschScore.toFixed(1)}. Consider simplifying your sentences.`;
  }

  return {
    score,
    details: {
      fleschScore: parseFloat(fleschScore.toFixed(1)),
      grade,
      wordCount,
      sentenceCount,
      avgWordsPerSentence: parseFloat(avgWordsPerSentence.toFixed(1)),
      message,
    },
  };
};

/**
 * Generate recommendations based on analysis
 */
const generateRecommendations = (result: SEOAnalysisResult): string[] => {
  const recommendations: string[] = [];

  // Title recommendations
  if (!result.details.title.optimal) {
    if (result.details.title.length < TITLE_OPTIMAL_MIN) {
      recommendations.push(`Extend your title to ${TITLE_OPTIMAL_MIN}-${TITLE_OPTIMAL_MAX} characters (currently ${result.details.title.length}).`);
    } else if (result.details.title.length > TITLE_OPTIMAL_MAX) {
      recommendations.push(`Shorten your title to ${TITLE_OPTIMAL_MAX} characters or less (currently ${result.details.title.length}).`);
    }
  }

  // Meta description recommendations
  if (!result.details.metaDescription.optimal) {
    if (result.details.metaDescription.length < META_DESC_OPTIMAL_MIN) {
      recommendations.push(`Extend your meta description to ${META_DESC_OPTIMAL_MIN}-${META_DESC_OPTIMAL_MAX} characters (currently ${result.details.metaDescription.length}).`);
    } else if (result.details.metaDescription.length > META_DESC_OPTIMAL_MAX) {
      recommendations.push(`Shorten your meta description to ${META_DESC_OPTIMAL_MAX} characters or less (currently ${result.details.metaDescription.length}).`);
    }
  }

  // Keyword density recommendations
  if (!result.details.keywordDensity.optimal) {
    if (result.details.keywordDensity.density < KEYWORD_DENSITY_OPTIMAL_MIN) {
      recommendations.push(`Increase keyword density to ${KEYWORD_DENSITY_OPTIMAL_MIN}-${KEYWORD_DENSITY_OPTIMAL_MAX}% (currently ${result.details.keywordDensity.density}%).`);
    } else if (result.details.keywordDensity.density > KEYWORD_DENSITY_OPTIMAL_MAX) {
      recommendations.push(`Reduce keyword density to avoid stuffing (currently ${result.details.keywordDensity.density}%).`);
    }
  }

  // Heading recommendations
  if (!result.details.headings.hasH2) {
    recommendations.push('Add H2 headings to structure your content better.');
  }
  if (!result.details.headings.hasH3) {
    recommendations.push('Add H3 subheadings to break up long sections.');
  }

  // Image alt recommendations
  if (result.details.images.withoutAlt > 0) {
    recommendations.push(`Add alt text to ${result.details.images.withoutAlt} image(s) without alt tags.`);
  }

  // Link recommendations
  if (result.details.links.internal === 0) {
    recommendations.push('Add internal links to improve site structure and navigation.');
  }
  if (result.details.links.external === 0) {
    recommendations.push('Add external links to authoritative sources to boost credibility.');
  }

  // Readability recommendations
  if (result.details.readability.fleschScore < 50) {
    recommendations.push('Simplify your sentences to improve readability. Aim for shorter sentences and simpler words.');
  } else if (result.details.readability.fleschScore > 80) {
    recommendations.push('Your content is very easy to read. Consider adding more depth for complex topics.');
  }

  return recommendations;
};

/**
 * Main function to calculate SEO score
 */
export const calculateSEOScore = (input: SEOAnalysisInput): SEOAnalysisResult => {
  const { title, metaDescription, content, url, keywords } = input;

  // Calculate individual scores
  const titleResult = calculateTitleScore(title);
  const metaDescResult = calculateMetaDescriptionScore(metaDescription);
  const keywordResult = calculateKeywordDensity(content, keywords);
  const headingResult = calculateHeadingScore(content);
  const imageResult = calculateImageAltScore(content);
  const linkResult = calculateLinkScore(content, url);
  const readabilityResult = calculateReadabilityScore(content);

  // Calculate weighted overall score
  const overallScore = Math.round(
    (titleResult.score * WEIGHTS.title +
      metaDescResult.score * WEIGHTS.metaDescription +
      keywordResult.score * WEIGHTS.keywordDensity +
      headingResult.score * WEIGHTS.headings +
      imageResult.score * WEIGHTS.imageAltTags +
      linkResult.score * WEIGHTS.internalLinks +
      linkResult.score * WEIGHTS.externalLinks +
      readabilityResult.score * WEIGHTS.readability) /
      (WEIGHTS.title +
        WEIGHTS.metaDescription +
        WEIGHTS.keywordDensity +
        WEIGHTS.headings +
        WEIGHTS.imageAltTags +
        WEIGHTS.internalLinks +
        WEIGHTS.externalLinks +
        WEIGHTS.readability)
  );

  const result: SEOAnalysisResult = {
    overallScore,
    breakdown: {
      title: titleResult.score,
      metaDescription: metaDescResult.score,
      keywordDensity: keywordResult.score,
      headings: headingResult.score,
      imageAltTags: imageResult.score,
      internalLinks: linkResult.score,
      externalLinks: linkResult.score,
      readability: readabilityResult.score,
    },
    details: {
      title: titleResult.details,
      metaDescription: metaDescResult.details,
      keywordDensity: keywordResult.details,
      headings: headingResult.details,
      images: imageResult.details,
      links: linkResult.details,
      readability: readabilityResult.details,
    },
    recommendations: [],
  };

  // Generate recommendations
  result.recommendations = generateRecommendations(result);

  return result;
};

export default calculateSEOScore;
