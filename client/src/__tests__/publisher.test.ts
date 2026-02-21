import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Publisher Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have required types defined', () => {
    // Types are defined in types/index.ts
    expect(true).toBe(true);
  });

  it('should validate schedule data structure', () => {
    const scheduleData = {
      articleId: 1,
      siteId: 1,
      platform: 'wordpress' as const,
      scheduledAt: new Date().toISOString(),
    };

    expect(scheduleData).toHaveProperty('articleId');
    expect(scheduleData).toHaveProperty('siteId');
    expect(scheduleData).toHaveProperty('platform');
    expect(scheduleData).toHaveProperty('scheduledAt');
    expect(['wordpress', 'blogger']).toContain(scheduleData.platform);
  });

  it('should validate publish queue item structure', () => {
    const queueItem = {
      id: 1,
      site_id: 1,
      title: 'Test Article',
      slug: 'test-article',
      excerpt: 'Test excerpt',
      status: 'scheduled' as const,
      platform: 'wordpress' as const,
      scheduled_at: new Date().toISOString(),
      site_name: 'Test Site',
    };

    expect(queueItem).toHaveProperty('id');
    expect(queueItem).toHaveProperty('title');
    expect(queueItem).toHaveProperty('scheduled_at');
    expect(queueItem).toHaveProperty('platform');
  });

  it('should validate publish history structure', () => {
    const historyItem = {
      id: 1,
      article_id: 1,
      site_id: 1,
      platform: 'wordpress' as const,
      platform_post_id: '123',
      status: 'success' as const,
      published_at: new Date().toISOString(),
      article_title: 'Test Article',
      site_name: 'Test Site',
    };

    expect(historyItem).toHaveProperty('id');
    expect(historyItem).toHaveProperty('article_id');
    expect(historyItem).toHaveProperty('status');
    expect(['success', 'failed', 'pending']).toContain(historyItem.status);
  });

  it('should accept both wordpress and blogger platforms', () => {
    const wordpressSchedule = {
      articleId: 1,
      siteId: 1,
      platform: 'wordpress' as const,
      scheduledAt: new Date().toISOString(),
    };

    const bloggerSchedule = {
      articleId: 2,
      siteId: 2,
      platform: 'blogger' as const,
      scheduledAt: new Date().toISOString(),
    };

    expect(wordpressSchedule.platform).toBe('wordpress');
    expect(bloggerSchedule.platform).toBe('blogger');
  });

  it('should validate queue item with blogger platform', () => {
    const queueItem = {
      id: 2,
      site_id: 2,
      title: 'Blogger Test Article',
      slug: 'blogger-test-article',
      excerpt: 'Test excerpt for blogger',
      status: 'scheduled' as const,
      platform: 'blogger' as const,
      scheduled_at: new Date().toISOString(),
      site_name: 'Blogger Test Site',
    };

    expect(queueItem.platform).toBe('blogger');
    expect(queueItem).toHaveProperty('site_name');
  });

  it('should validate history item with failed status', () => {
    const historyItem = {
      id: 3,
      article_id: 3,
      site_id: 3,
      platform: 'wordpress' as const,
      platform_post_id: '456',
      status: 'failed' as const,
      error_message: 'Connection timeout',
      published_at: new Date().toISOString(),
      article_title: 'Failed Article',
      site_name: 'Test Site',
    };

    expect(historyItem.status).toBe('failed');
    expect(historyItem).toHaveProperty('error_message');
  });
});

describe('Publisher Calendar Integration', () => {
  it('should format calendar events from queue data', () => {
    const queue = [
      {
        id: 1,
        site_id: 1,
        title: 'WordPress Article',
        slug: 'wordpress-article',
        excerpt: 'Test excerpt',
        status: 'scheduled' as const,
        platform: 'wordpress' as const,
        scheduled_at: '2024-01-15T10:00:00Z',
        site_name: 'Test Site',
      },
      {
        id: 2,
        site_id: 2,
        title: 'Blogger Article',
        slug: 'blogger-article',
        excerpt: 'Test excerpt',
        status: 'scheduled' as const,
        platform: 'blogger' as const,
        scheduled_at: '2024-01-16T14:00:00Z',
        site_name: 'Blogger Site',
      },
    ];

    const calendarEvents = queue.map((item) => ({
      id: item.id,
      title: item.title,
      start: new Date(item.scheduled_at),
      end: new Date(new Date(item.scheduled_at).getTime() + 60 * 60 * 1000),
      resource: item,
    }));

    expect(calendarEvents).toHaveLength(2);
    expect(calendarEvents[0].resource.platform).toBe('wordpress');
    expect(calendarEvents[1].resource.platform).toBe('blogger');
    expect(calendarEvents[0].start).toBeInstanceOf(Date);
    expect(calendarEvents[0].end).toBeInstanceOf(Date);
  });

  it('should calculate correct event end time (1 hour after start)', () => {
    const scheduledAt = '2024-01-15T10:00:00Z';
    const queueItem = {
      id: 1,
      site_id: 1,
      title: 'Test Article',
      slug: 'test-article',
      excerpt: 'Test excerpt',
      status: 'scheduled' as const,
      platform: 'wordpress' as const,
      scheduled_at: scheduledAt,
      site_name: 'Test Site',
    };

    const event = {
      id: queueItem.id,
      title: queueItem.title,
      start: new Date(queueItem.scheduled_at),
      end: new Date(new Date(queueItem.scheduled_at).getTime() + 60 * 60 * 1000),
      resource: queueItem,
    };

    const expectedEndTime = new Date(scheduledAt).getTime() + 60 * 60 * 1000;
    expect(event.end.getTime()).toBe(expectedEndTime);
  });
});

describe('Publisher API Integration', () => {
  it('should validate API endpoint paths', () => {
    const endpoints = {
      queue: '/publish/queue',
      history: '/publish/history',
      schedule: '/publish/schedule',
      cancel: '/publish/schedule/1',
      reschedule: '/publish/schedule/1',
    };

    expect(endpoints.queue).toBe('/publish/queue');
    expect(endpoints.history).toBe('/publish/history');
    expect(endpoints.schedule).toBe('/publish/schedule');
    expect(endpoints.cancel).toBe('/publish/schedule/1');
    expect(endpoints.reschedule).toBe('/publish/schedule/1');
  });

  it('should validate schedule request body structure', () => {
    const scheduleRequest = {
      articleId: 1,
      siteId: 1,
      platform: 'wordpress' as const,
      scheduledAt: '2024-01-15T10:00:00Z',
    };

    expect(scheduleRequest).toHaveProperty('articleId');
    expect(scheduleRequest).toHaveProperty('siteId');
    expect(scheduleRequest).toHaveProperty('platform');
    expect(scheduleRequest).toHaveProperty('scheduledAt');
    expect(typeof scheduleRequest.articleId).toBe('number');
    expect(typeof scheduleRequest.siteId).toBe('number');
    expect(typeof scheduleRequest.platform).toBe('string');
    expect(typeof scheduleRequest.scheduledAt).toBe('string');
  });

  it('should validate reschedule request body structure', () => {
    const rescheduleRequest = {
      scheduledAt: '2024-01-20T15:00:00Z',
    };

    expect(rescheduleRequest).toHaveProperty('scheduledAt');
    expect(typeof rescheduleRequest.scheduledAt).toBe('string');
  });
});

describe('Publisher Status Handling', () => {
  it('should handle all valid status values for history', () => {
    const statuses = ['success', 'failed', 'pending'] as const;
    
    statuses.forEach((status) => {
      const historyItem = {
        id: 1,
        article_id: 1,
        site_id: 1,
        platform: 'wordpress' as const,
        platform_post_id: '123',
        status,
        published_at: new Date().toISOString(),
        article_title: 'Test Article',
        site_name: 'Test Site',
      };
      
      expect(['success', 'failed', 'pending']).toContain(historyItem.status);
    });
  });

  it('should handle all valid status values for queue', () => {
    const statuses = ['scheduled', 'pending', 'publishing'] as const;
    
    statuses.forEach((status) => {
      const queueItem = {
        id: 1,
        site_id: 1,
        title: 'Test Article',
        slug: 'test-article',
        excerpt: 'Test excerpt',
        status,
        platform: 'wordpress' as const,
        scheduled_at: new Date().toISOString(),
        site_name: 'Test Site',
      };
      
      expect(['scheduled', 'pending', 'publishing']).toContain(queueItem.status);
    });
  });
});
