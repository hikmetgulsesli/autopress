import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SiteManager from '../pages/SiteManager';

// Mock the site store
const mockCreateSite = vi.fn();
const mockUpdateSite = vi.fn();
const mockTestConnection = vi.fn();

vi.mock('../store/siteStore', () => ({
  useSiteStore: vi.fn((selector) => {
    const state = {
      sites: [
        {
          id: 1,
          name: 'Test WordPress Site',
          domain: 'testwp.com',
          platform: 'wordpress' as const,
          platform_id: 'https://testwp.com',
          api_credentials: {
            wordpress: {
              site_url: 'https://testwp.com',
              username: 'admin',
              app_password: '********'
            }
          },
          language: 'tr',
          niche: 'technology',
          adsense_status: 'pending',
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 2,
          name: 'Test Blogger Site',
          domain: 'testblog.blogspot.com',
          platform: 'blogger' as const,
          platform_id: '123456789',
          api_credentials: {
            blogger: {
              client_id: '********.apps.googleusercontent.com',
              client_secret: '********',
              oauth_token: '********',
              oauth_refresh_token: '********',
              oauth_expires_at: '2024-12-31T23:59:59Z'
            }
          },
          language: 'en',
          niche: 'lifestyle',
          adsense_status: 'approved',
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ],
      isLoading: false,
      fetchSites: vi.fn().mockResolvedValue(undefined),
      createSite: mockCreateSite,
      updateSite: mockUpdateSite,
      deleteSite: vi.fn(),
      testConnection: mockTestConnection,
    };
    return selector ? selector(state) : state;
  }),
}));

describe('SiteManager - API Credentials Form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('New Site Form - Platform Selection', () => {
    it('should show Blogger credential fields by default for new site', async () => {
      render(
        <MemoryRouter>
          <SiteManager />
        </MemoryRouter>
      );

      // Click "Yeni Site" (New Site) button
      const newSiteButton = screen.getByText('Yeni Site');
      fireEvent.click(newSiteButton);

      await waitFor(() => {
        expect(screen.getByText('Yeni Site Ekle')).toBeInTheDocument();
      });

      // Blogger credential fields should be visible by default
      expect(screen.getByText('Blogger OAuth Bilgileri')).toBeInTheDocument();
    });

    it('should show WordPress credential fields when platform is switched to wordpress', async () => {
      render(
        <MemoryRouter>
          <SiteManager />
        </MemoryRouter>
      );

      const newSiteButton = screen.getByText('Yeni Site');
      fireEvent.click(newSiteButton);

      await waitFor(() => {
        expect(screen.getByText('Yeni Site Ekle')).toBeInTheDocument();
      });

      // Find platform select
      const platformSelect = document.querySelector('select') as HTMLSelectElement;
      
      fireEvent.change(platformSelect, { target: { value: 'wordpress' } });

      // WordPress fields should appear
      await waitFor(() => {
        expect(screen.getByText('WordPress API Bilgileri')).toBeInTheDocument();
      });

      // Blogger fields should not be visible
      expect(screen.queryByText('Blogger OAuth Bilgileri')).not.toBeInTheDocument();
    });
  });

  describe('WordPress Credential Fields', () => {
    it('should have password type for WordPress app password field', async () => {
      render(
        <MemoryRouter>
          <SiteManager />
        </MemoryRouter>
      );

      const newSiteButton = screen.getByText('Yeni Site');
      fireEvent.click(newSiteButton);

      await waitFor(() => {
        expect(screen.getByText('Yeni Site Ekle')).toBeInTheDocument();
      });

      // Switch to WordPress
      const platformSelect = document.querySelector('select') as HTMLSelectElement;
      fireEvent.change(platformSelect, { target: { value: 'wordpress' } });

      await waitFor(() => {
        expect(screen.getByText('WordPress API Bilgileri')).toBeInTheDocument();
      });

      // Find the app password input by its placeholder
      const appPasswordInput = screen.getByPlaceholderText('xxxx xxxx xxxx xxxx xxxx xxxx');
      expect(appPasswordInput).toHaveAttribute('type', 'password');
    });

    it('should have url type for WordPress site URL field', async () => {
      render(
        <MemoryRouter>
          <SiteManager />
        </MemoryRouter>
      );

      const newSiteButton = screen.getByText('Yeni Site');
      fireEvent.click(newSiteButton);

      await waitFor(() => {
        expect(screen.getByText('Yeni Site Ekle')).toBeInTheDocument();
      });

      // Switch to WordPress
      const platformSelect = document.querySelector('select') as HTMLSelectElement;
      fireEvent.change(platformSelect, { target: { value: 'wordpress' } });

      await waitFor(() => {
        expect(screen.getByText('WordPress API Bilgileri')).toBeInTheDocument();
      });

      const siteUrlInput = screen.getByPlaceholderText('https://ornek.com');
      expect(siteUrlInput).toHaveAttribute('type', 'url');
    });

    it('should display WordPress credential section with correct labels', async () => {
      render(
        <MemoryRouter>
          <SiteManager />
        </MemoryRouter>
      );

      const newSiteButton = screen.getByText('Yeni Site');
      fireEvent.click(newSiteButton);

      await waitFor(() => {
        expect(screen.getByText('Yeni Site Ekle')).toBeInTheDocument();
      });

      // Switch to WordPress
      const platformSelect = document.querySelector('select') as HTMLSelectElement;
      fireEvent.change(platformSelect, { target: { value: 'wordpress' } });

      await waitFor(() => {
        expect(screen.getByText('WordPress API Bilgileri')).toBeInTheDocument();
      });

      // Check that credential fields have labels
      expect(screen.getByText('Site URL')).toBeInTheDocument();
      expect(screen.getByText('Kullanıcı Adı')).toBeInTheDocument();
      expect(screen.getByText('Uygulama Şifresi')).toBeInTheDocument();
    });
  });

  describe('Blogger Credential Fields', () => {
    it('should have password type for Blogger client secret field', async () => {
      render(
        <MemoryRouter>
          <SiteManager />
        </MemoryRouter>
      );

      const newSiteButton = screen.getByText('Yeni Site');
      fireEvent.click(newSiteButton);

      await waitFor(() => {
        expect(screen.getByText('Yeni Site Ekle')).toBeInTheDocument();
      });

      const clientSecretInput = screen.getByPlaceholderText('Google Cloud Console Client Secret');
      expect(clientSecretInput).toHaveAttribute('type', 'password');
    });

    it('should have text type for Blogger client ID field', async () => {
      render(
        <MemoryRouter>
          <SiteManager />
        </MemoryRouter>
      );

      const newSiteButton = screen.getByText('Yeni Site');
      fireEvent.click(newSiteButton);

      await waitFor(() => {
        expect(screen.getByText('Yeni Site Ekle')).toBeInTheDocument();
      });

      const clientIdInput = screen.getByPlaceholderText('Google Cloud Console Client ID');
      expect(clientIdInput).toHaveAttribute('type', 'text');
    });

    it('should display Blogger credential section with correct labels', async () => {
      render(
        <MemoryRouter>
          <SiteManager />
        </MemoryRouter>
      );

      const newSiteButton = screen.getByText('Yeni Site');
      fireEvent.click(newSiteButton);

      await waitFor(() => {
        expect(screen.getByText('Yeni Site Ekle')).toBeInTheDocument();
      });

      expect(screen.getByText('Blogger OAuth Bilgileri')).toBeInTheDocument();
      expect(screen.getByText('Client ID')).toBeInTheDocument();
      expect(screen.getByText('Client Secret')).toBeInTheDocument();
    });
  });

  describe('Credential Storage', () => {
    it('should store WordPress credentials in api_credentials structure on save', async () => {
      mockCreateSite.mockResolvedValueOnce({});

      render(
        <MemoryRouter>
          <SiteManager />
        </MemoryRouter>
      );

      const newSiteButton = screen.getByText('Yeni Site');
      fireEvent.click(newSiteButton);

      await waitFor(() => {
        expect(screen.getByText('Yeni Site Ekle')).toBeInTheDocument();
      });

      // Fill in basic info - find by label text
      const nameLabel = screen.getByText('Site Adı *');
      const nameInput = nameLabel.parentElement?.querySelector('input') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'New WordPress Site' } });

      // Switch to WordPress
      const platformSelect = document.querySelector('select') as HTMLSelectElement;
      fireEvent.change(platformSelect, { target: { value: 'wordpress' } });

      await waitFor(() => {
        expect(screen.getByText('WordPress API Bilgileri')).toBeInTheDocument();
      });

      // Fill in WordPress credentials
      const siteUrlInput = screen.getByPlaceholderText('https://ornek.com');
      fireEvent.change(siteUrlInput, { target: { value: 'https://newsite.com' } });

      const usernameInput = screen.getByPlaceholderText('wordpress_kullanici');
      fireEvent.change(usernameInput, { target: { value: 'newuser' } });

      const passwordInput = screen.getByPlaceholderText('xxxx xxxx xxxx xxxx xxxx xxxx');
      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });

      // Submit form
      const submitButton = screen.getByText('Site Ekle');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateSite).toHaveBeenCalled();
      });

      // Verify the call includes api_credentials
      const callArg = mockCreateSite.mock.calls[0][0];
      expect(callArg).toHaveProperty('api_credentials');
      expect(callArg.api_credentials).toHaveProperty('wordpress');
      expect(callArg.api_credentials.wordpress).toEqual({
        site_url: 'https://newsite.com',
        username: 'newuser',
        app_password: 'newpassword123'
      });
    });

    it('should store Blogger credentials in api_credentials structure on save', async () => {
      mockCreateSite.mockResolvedValueOnce({});

      render(
        <MemoryRouter>
          <SiteManager />
        </MemoryRouter>
      );

      const newSiteButton = screen.getByText('Yeni Site');
      fireEvent.click(newSiteButton);

      await waitFor(() => {
        expect(screen.getByText('Yeni Site Ekle')).toBeInTheDocument();
      });

      // Fill in basic info
      const nameLabel = screen.getByText('Site Adı *');
      const nameInput = nameLabel.parentElement?.querySelector('input') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'New Blogger Site' } });

      // Fill in Blogger credentials (already visible by default)
      const clientIdInput = screen.getByPlaceholderText('Google Cloud Console Client ID');
      fireEvent.change(clientIdInput, { target: { value: '123456.apps.googleusercontent.com' } });

      const clientSecretInput = screen.getByPlaceholderText('Google Cloud Console Client Secret');
      fireEvent.change(clientSecretInput, { target: { value: '********' } });

      // Submit form
      const submitButton = screen.getByText('Site Ekle');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateSite).toHaveBeenCalled();
      });

      // Verify the call includes api_credentials
      const callArg = mockCreateSite.mock.calls[0][0];
      expect(callArg).toHaveProperty('api_credentials');
      expect(callArg.api_credentials).toHaveProperty('blogger');
      expect(callArg.api_credentials.blogger).toEqual({
        client_id: '123456.apps.googleusercontent.com',
        client_secret: '********'
      });
    });
  });

  describe('Form Accessibility', () => {
    it('should have helper text for WordPress app password', async () => {
      render(
        <MemoryRouter>
          <SiteManager />
        </MemoryRouter>
      );

      const newSiteButton = screen.getByText('Yeni Site');
      fireEvent.click(newSiteButton);

      await waitFor(() => {
        expect(screen.getByText('Yeni Site Ekle')).toBeInTheDocument();
      });

      const platformSelect = document.querySelector('select') as HTMLSelectElement;
      fireEvent.change(platformSelect, { target: { value: 'wordpress' } });

      await waitFor(() => {
        expect(screen.getByText('WordPress API Bilgileri')).toBeInTheDocument();
      });

      // Check for helper text
      expect(screen.getByText(/WordPress Admin.*Kullanıcılar.*Uygulama Şifreleri/i)).toBeInTheDocument();
    });

    it('should have OAuth helper text for Blogger credentials', async () => {
      render(
        <MemoryRouter>
          <SiteManager />
        </MemoryRouter>
      );

      const newSiteButton = screen.getByText('Yeni Site');
      fireEvent.click(newSiteButton);

      await waitFor(() => {
        expect(screen.getByText('Yeni Site Ekle')).toBeInTheDocument();
      });

      // Check for OAuth helper text
      expect(screen.getByText(/Google Cloud Console.*Client ID ve Secret/i)).toBeInTheDocument();
    });
  });
});
