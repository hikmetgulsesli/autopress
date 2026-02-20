import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the googleapis module
const mockOAuth2Client = {
  generateAuthUrl: vi.fn(),
  getToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  setCredentials: vi.fn(),
};

const mockBlogsListByUser = vi.fn();
const mockBlogsGet = vi.fn();
const mockPostsInsert = vi.fn();
const mockPostsPatch = vi.fn();
const mockPostsDelete = vi.fn();
const mockPostsList = vi.fn();
const mockPagesInsert = vi.fn();

const mockBlogger = {
  blogs: {
    listByUser: mockBlogsListByUser,
    get: mockBlogsGet,
  },
  posts: {
    insert: mockPostsInsert,
    patch: mockPostsPatch,
    delete: mockPostsDelete,
    list: mockPostsList,
  },
  pages: {
    insert: mockPagesInsert,
  },
};

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(function() {
        return mockOAuth2Client;
      }),
    },
    blogger: vi.fn(() => mockBlogger),
  },
}));

// Mock database
vi.mock('../db/connection', () => ({
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks
import {
  initializeOAuth2Client,
  getAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  setCredentials,
  listBlogs,
  getBlog,
  publishPost,
  publishPage,
  updatePost,
  deletePost,
  listPosts,
  BloggerCredentials,
  BloggerTokens,
} from './blogger.service';

describe('Blogger Service', () => {
  const mockCredentials: BloggerCredentials = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3000/callback',
  };

  const mockTokens: BloggerTokens = {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiryDate: Date.now() + 3600 * 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initializeOAuth2Client', () => {
    it('should initialize OAuth2 client with valid credentials', () => {
      const client = initializeOAuth2Client(mockCredentials);
      expect(client).toBeDefined();
    });

    it('should throw error for missing clientId', () => {
      try {
        initializeOAuth2Client({ ...mockCredentials, clientId: '' });
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.code).toBe('INVALID_CREDENTIALS');
      }
    });

    it('should throw error for missing clientSecret', () => {
      try {
        initializeOAuth2Client({ ...mockCredentials, clientSecret: '' });
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.code).toBe('INVALID_CREDENTIALS');
      }
    });

    it('should throw error for missing redirectUri', () => {
      try {
        initializeOAuth2Client({ ...mockCredentials, redirectUri: '' });
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.code).toBe('INVALID_CREDENTIALS');
      }
    });
  });

  describe('getAuthUrl', () => {
    it('should generate authorization URL', () => {
      mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth2/auth');
      initializeOAuth2Client(mockCredentials);
      const url = getAuthUrl();
      expect(url).toContain('accounts.google.com');
    });

    it('should use custom scopes when provided', () => {
      mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth2/auth?scope=custom');
      initializeOAuth2Client(mockCredentials);
      const customScopes = ['https://www.googleapis.com/auth/blogger.readonly'];
      const url = getAuthUrl(customScopes);
      expect(url).toBeDefined();
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens', async () => {
      mockOAuth2Client.getToken.mockResolvedValue({
        tokens: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expiry_date: Date.now() + 3600 * 1000,
        },
      });

      initializeOAuth2Client(mockCredentials);
      const tokens = await exchangeCodeForTokens('auth-code');

      expect(tokens.accessToken).toBe('new-access-token');
      expect(tokens.refreshToken).toBe('new-refresh-token');
    });

    it('should throw error when no access token received', async () => {
      mockOAuth2Client.getToken.mockResolvedValue({
        tokens: {},
      });

      initializeOAuth2Client(mockCredentials);
      try {
        await exchangeCodeForTokens('auth-code');
        expect.fail('Should have thrown error');
      } catch (err: any) {
        // The error gets wrapped in AUTH_CODE_EXCHANGE_FAILED
        expect(err.code).toBe('AUTH_CODE_EXCHANGE_FAILED');
      }
    });

    it('should handle exchange errors', async () => {
      mockOAuth2Client.getToken.mockRejectedValue({
        message: 'Invalid code',
        response: { data: { error: 'invalid_grant' } },
      });

      initializeOAuth2Client(mockCredentials);
      try {
        await exchangeCodeForTokens('invalid-code');
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.code).toBe('AUTH_CODE_EXCHANGE_FAILED');
      }
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token', async () => {
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: {
          access_token: 'refreshed-access-token',
          refresh_token: 'new-refresh-token',
          expiry_date: Date.now() + 3600 * 1000,
        },
      });

      initializeOAuth2Client(mockCredentials);
      const tokens = await refreshAccessToken('refresh-token');

      expect(tokens.accessToken).toBe('refreshed-access-token');
    });

    it('should throw error when refresh fails', async () => {
      mockOAuth2Client.refreshAccessToken.mockRejectedValue({
        message: 'Invalid refresh token',
        response: { status: 401, data: { error: 'invalid_grant' } },
      });

      initializeOAuth2Client(mockCredentials);
      try {
        await refreshAccessToken('invalid-token');
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.code).toBe('TOKEN_REFRESH_FAILED');
      }
    });
  });

  describe('setCredentials', () => {
    it('should set credentials on OAuth2 client', () => {
      initializeOAuth2Client(mockCredentials);
      expect(() => setCredentials(mockTokens)).not.toThrow();
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalled();
    });
  });

  describe('listBlogs', () => {
    it('should return list of blogs', async () => {
      mockBlogsListByUser.mockResolvedValue({
        data: {
          items: [
            { id: '123', name: 'Test Blog', url: 'https://test.blogspot.com' },
          ],
        },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      const blogs = await listBlogs();

      expect(blogs).toHaveLength(1);
      expect(blogs[0].id).toBe('123');
      expect(blogs[0].name).toBe('Test Blog');
    });

    it('should return empty array when no blogs', async () => {
      mockBlogsListByUser.mockResolvedValue({
        data: { items: [] },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      const blogs = await listBlogs();
      expect(blogs).toHaveLength(0);
    });

    it('should handle authentication error', async () => {
      mockBlogsListByUser.mockRejectedValue({
        response: { status: 401, data: { error: { message: 'Unauthorized' } } },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      try {
        await listBlogs();
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.code).toBe('AUTH_ERROR');
      }
    });

    it('should handle forbidden error', async () => {
      mockBlogsListByUser.mockRejectedValue({
        response: { status: 403, data: { error: { message: 'Forbidden' } } },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      try {
        await listBlogs();
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('getBlog', () => {
    it('should return blog info', async () => {
      mockBlogsGet.mockResolvedValue({
        data: {
          id: '123',
          name: 'Test Blog',
          url: 'https://test.blogspot.com',
          description: 'A test blog',
        },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      const blog = await getBlog('123');

      expect(blog.id).toBe('123');
      expect(blog.name).toBe('Test Blog');
    });

    it('should handle blog not found', async () => {
      mockBlogsGet.mockRejectedValue({
        response: { status: 404, data: { error: { message: 'Not found' } } },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      try {
        await getBlog('999');
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.code).toBe('BLOG_NOT_FOUND');
      }
    });
  });

  describe('publishPost', () => {
    it('should publish a post successfully', async () => {
      mockPostsInsert.mockResolvedValue({
        data: {
          id: 'post-123',
          title: 'Test Post',
          url: 'https://test.blogspot.com/2024/01/test-post.html',
          published: '2024-01-01T00:00:00Z',
        },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      const result = await publishPost({
        blogId: '123',
        title: 'Test Post',
        content: '<p>Test content</p>',
        labels: ['test', 'blog'],
      });

      expect(result.id).toBe('post-123');
      expect(result.title).toBe('Test Post');
    });

    it('should publish post as draft when isDraft is true', async () => {
      mockPostsInsert.mockResolvedValue({
        data: { id: 'post-123', title: 'Draft Post', url: '' },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      await publishPost({
        blogId: '123',
        title: 'Draft Post',
        content: '<p>Draft content</p>',
        isDraft: true,
      });

      expect(mockPostsInsert).toHaveBeenCalledWith(
        expect.objectContaining({ isDraft: true })
      );
    });

    it('should handle authentication error', async () => {
      mockPostsInsert.mockRejectedValue({
        response: { status: 401, data: { error: { message: 'Unauthorized' } } },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      try {
        await publishPost({ blogId: '123', title: 'Test', content: 'Content' });
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.code).toBe('AUTH_ERROR');
      }
    });

    it('should handle blog not found error', async () => {
      mockPostsInsert.mockRejectedValue({
        response: { status: 404, data: { error: { message: 'Not found' } } },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      try {
        await publishPost({ blogId: '999', title: 'Test', content: 'Content' });
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.code).toBe('BLOG_NOT_FOUND');
      }
    });

    it('should handle forbidden error', async () => {
      mockPostsInsert.mockRejectedValue({
        response: { status: 403, data: { error: { message: 'Forbidden' } } },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      try {
        await publishPost({ blogId: '123', title: 'Test', content: 'Content' });
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('publishPage', () => {
    it('should publish a page successfully', async () => {
      mockPagesInsert.mockResolvedValue({
        data: {
          id: 'page-123',
          title: 'About Us',
          url: 'https://test.blogspot.com/p/about-us.html',
          published: '2024-01-01T00:00:00Z',
        },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      const result = await publishPage({
        blogId: '123',
        title: 'About Us',
        content: '<p>About us content</p>',
      });

      expect(result.id).toBe('page-123');
      expect(result.title).toBe('About Us');
    });

    it('should handle page publish errors', async () => {
      mockPagesInsert.mockRejectedValue({
        response: { status: 400, data: { error: { message: 'Invalid content' } } },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      try {
        await publishPage({ blogId: '123', title: 'Test', content: 'Content' });
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.code).toBe('INVALID_REQUEST');
      }
    });
  });

  describe('updatePost', () => {
    it('should update a post successfully', async () => {
      mockPostsPatch.mockResolvedValue({
        data: {
          id: 'post-123',
          title: 'Updated Title',
          url: 'https://test.blogspot.com/2024/01/test-post.html',
          updated: '2024-01-02T00:00:00Z',
        },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      const result = await updatePost('123', 'post-123', {
        title: 'Updated Title',
        content: '<p>Updated content</p>',
      });

      expect(result.title).toBe('Updated Title');
    });

    it('should handle post not found during update', async () => {
      mockPostsPatch.mockRejectedValue({
        response: { status: 404, data: { error: { message: 'Not found' } } },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      try {
        await updatePost('123', 'nonexistent', { title: 'Test' });
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.code).toBe('POST_NOT_FOUND');
      }
    });
  });

  describe('deletePost', () => {
    it('should delete a post successfully', async () => {
      mockPostsDelete.mockResolvedValue({ data: {} });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      await expect(deletePost('123', 'post-123')).resolves.not.toThrow();
    });

    it('should handle post not found during delete', async () => {
      mockPostsDelete.mockRejectedValue({
        response: { status: 404, data: { error: { message: 'Not found' } } },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      try {
        await deletePost('123', 'nonexistent');
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.code).toBe('POST_NOT_FOUND');
      }
    });
  });

  describe('listPosts', () => {
    it('should return list of posts', async () => {
      mockPostsList.mockResolvedValue({
        data: {
          items: [
            { id: 'post-1', title: 'Post 1', url: 'https://test.blogspot.com/2024/01/post1.html' },
            { id: 'post-2', title: 'Post 2', url: 'https://test.blogspot.com/2024/01/post2.html' },
          ],
        },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      const posts = await listPosts('123');

      expect(posts).toHaveLength(2);
      expect(posts[0].id).toBe('post-1');
    });

    it('should respect maxResults option', async () => {
      mockPostsList.mockResolvedValue({
        data: { items: [] },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      await listPosts('123', { maxResults: 5 });

      expect(mockPostsList).toHaveBeenCalledWith(
        expect.objectContaining({ maxResults: 5 })
      );
    });

    it('should handle blog not found when listing posts', async () => {
      mockPostsList.mockRejectedValue({
        response: { status: 404, data: { error: { message: 'Not found' } } },
      });

      initializeOAuth2Client(mockCredentials);
      setCredentials(mockTokens);

      try {
        await listPosts('999');
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.code).toBe('BLOG_NOT_FOUND');
      }
    });
  });
});
