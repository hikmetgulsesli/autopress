import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settings from './Settings';
import api from '../services/api';

// Mock the API module
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock the auth store
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 1, name: 'Test User', email: 'test@example.com' },
    isAuthenticated: true,
    checkAuth: vi.fn(),
  })),
}));

describe('Settings - Notifications Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the settings page with notifications tab', () => {
    (api.get as any).mockResolvedValue({ data: {} });
    render(<Settings />);
    expect(screen.getByText('Ayarlar')).toBeInTheDocument();
    expect(screen.getByText('Bildirimler')).toBeInTheDocument();
  });

  it('switches to notifications tab when clicked', async () => {
    (api.get as any).mockResolvedValue({ data: {} });
    render(<Settings />);
    const notificationsTab = screen.getByText('Bildirimler');
    fireEvent.click(notificationsTab);
    await waitFor(() => {
      expect(screen.getByText('Bildirim Ayarları')).toBeInTheDocument();
    });
  });

  it('renders loading state initially in notifications tab', async () => {
    (api.get as any).mockImplementation(() => new Promise(() => {}));
    render(<Settings />);
    const notificationsTab = screen.getByText('Bildirimler');
    fireEvent.click(notificationsTab);
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  it('renders notification settings after loading', async () => {
    (api.get as any).mockResolvedValue({
      data: { emailEnabled: true, pushEnabled: false, notifyOnPublishSuccess: true, notifyOnPublishFailed: false, notifyOnTrendingTopic: true },
    });
    render(<Settings />);
    fireEvent.click(screen.getByText('Bildirimler'));
    await waitFor(() => {
      expect(screen.getByText('Bildirim Ayarları')).toBeInTheDocument();
    });
    expect(screen.getByText('E-posta Bildirimleri')).toBeInTheDocument();
    expect(screen.getByText('Push Bildirimleri')).toBeInTheDocument();
    expect(screen.getByText('Yayın Başarılı')).toBeInTheDocument();
    expect(screen.getByText('Yayın Başarısız')).toBeInTheDocument();
    expect(screen.getByText('Trend Konu')).toBeInTheDocument();
  });

  it('toggles email notifications', async () => {
    (api.get as any).mockResolvedValue({ data: { emailEnabled: false } });
    (api.put as any).mockResolvedValue({ data: {} });
    render(<Settings />);
    fireEvent.click(screen.getByText('Bildirimler'));
    await waitFor(() => {
      expect(screen.getByText('E-posta Bildirimleri')).toBeInTheDocument();
    });
    const emailToggle = screen.getByRole('switch', { name: /e-posta/i });
    expect(emailToggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(emailToggle);
    expect(emailToggle).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles push notifications', async () => {
    (api.get as any).mockResolvedValue({ data: { pushEnabled: false } });
    (api.put as any).mockResolvedValue({ data: {} });
    render(<Settings />);
    fireEvent.click(screen.getByText('Bildirimler'));
    await waitFor(() => {
      expect(screen.getByText('Push Bildirimleri')).toBeInTheDocument();
    });
    const pushToggle = screen.getByRole('switch', { name: /push/i });
    expect(pushToggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(pushToggle);
    expect(pushToggle).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles publish success notifications', async () => {
    (api.get as any).mockResolvedValue({ data: { notifyOnPublishSuccess: false } });
    (api.put as any).mockResolvedValue({ data: {} });
    render(<Settings />);
    fireEvent.click(screen.getByText('Bildirimler'));
    await waitFor(() => {
      expect(screen.getByText('Yayın Başarılı')).toBeInTheDocument();
    });
    const toggle = screen.getByRole('switch', { name: /yayın başarılı/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles publish failed notifications', async () => {
    (api.get as any).mockResolvedValue({ data: { notifyOnPublishFailed: false } });
    (api.put as any).mockResolvedValue({ data: {} });
    render(<Settings />);
    fireEvent.click(screen.getByText('Bildirimler'));
    await waitFor(() => {
      expect(screen.getByText('Yayın Başarısız')).toBeInTheDocument();
    });
    const toggle = screen.getByRole('switch', { name: /yayın başarısız/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles trending topic notifications', async () => {
    (api.get as any).mockResolvedValue({ data: { notifyOnTrendingTopic: false } });
    (api.put as any).mockResolvedValue({ data: {} });
    render(<Settings />);
    fireEvent.click(screen.getByText('Bildirimler'));
    await waitFor(() => {
      expect(screen.getByText('Trend Konu')).toBeInTheDocument();
    });
    const toggle = screen.getByRole('switch', { name: /trend konu/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('saves settings when save button is clicked', async () => {
    (api.get as any).mockResolvedValue({ data: { emailEnabled: true, pushEnabled: false, notifyOnPublishSuccess: true, notifyOnPublishFailed: false, notifyOnTrendingTopic: false } });
    (api.put as any).mockResolvedValue({ data: {} });
    render(<Settings />);
    fireEvent.click(screen.getByText('Bildirimler'));
    await waitFor(() => {
      expect(screen.getByText('Kaydet')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Kaydet'));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/settings/emailEnabled', { value: true, type: 'boolean' });
      expect(api.put).toHaveBeenCalledWith('/settings/pushEnabled', { value: false, type: 'boolean' });
      expect(api.put).toHaveBeenCalledWith('/settings/notifyOnPublishSuccess', { value: true, type: 'boolean' });
      expect(api.put).toHaveBeenCalledWith('/settings/notifyOnPublishFailed', { value: false, type: 'boolean' });
      expect(api.put).toHaveBeenCalledWith('/settings/notifyOnTrendingTopic', { value: false, type: 'boolean' });
    });
  });

  it('shows success message after saving', async () => {
    (api.get as any).mockResolvedValue({ data: {} });
    (api.put as any).mockResolvedValue({ data: {} });
    render(<Settings />);
    fireEvent.click(screen.getByText('Bildirimler'));
    await waitFor(() => {
      expect(screen.getByText('Kaydet')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Kaydet'));
    await waitFor(() => {
      expect(screen.getByText('Ayarlar başarıyla kaydedildi')).toBeInTheDocument();
    });
  });

  it('shows error message when save fails', async () => {
    (api.get as any).mockResolvedValue({ data: {} });
    (api.put as any).mockRejectedValue({ response: { data: { error: 'Kaydetme başarısız' } } });
    render(<Settings />);
    fireEvent.click(screen.getByText('Bildirimler'));
    await waitFor(() => {
      expect(screen.getByText('Kaydet')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Kaydet'));
    await waitFor(() => {
      expect(screen.getByText('Kaydetme başarısız')).toBeInTheDocument();
    });
  });

  it('shows error message when fetch fails', async () => {
    (api.get as any).mockRejectedValue({ response: { data: { error: 'Yükleme başarısız' } } });
    render(<Settings />);
    fireEvent.click(screen.getByText('Bildirimler'));
    await waitFor(() => {
      expect(screen.getByText('Yükleme başarısız')).toBeInTheDocument();
    });
  });

  it('has correct accessibility attributes for toggles', async () => {
    (api.get as any).mockResolvedValue({ data: { emailEnabled: true, pushEnabled: false } });
    render(<Settings />);
    fireEvent.click(screen.getByText('Bildirimler'));
    await waitFor(() => {
      expect(screen.getByText('E-posta Bildirimleri')).toBeInTheDocument();
    });
    expect(screen.getByRole('switch', { name: /e-posta/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /push/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('disables save button while saving', async () => {
    (api.get as any).mockResolvedValue({ data: {} });
    (api.put as any).mockImplementation(() => new Promise(() => {}));
    render(<Settings />);
    fireEvent.click(screen.getByText('Bildirimler'));
    await waitFor(() => {
      expect(screen.getByText('Kaydet')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Kaydet'));
    await waitFor(() => {
      expect(screen.getByText('Kaydediliyor...')).toBeInTheDocument();
    });
  });

  it('calls API with correct parameters for each setting', async () => {
    (api.get as any).mockResolvedValue({ data: { emailEnabled: false, pushEnabled: false, notifyOnPublishSuccess: false, notifyOnPublishFailed: false, notifyOnTrendingTopic: false } });
    (api.put as any).mockResolvedValue({ data: {} });
    render(<Settings />);
    fireEvent.click(screen.getByText('Bildirimler'));
    await waitFor(() => {
      expect(screen.getByText('E-posta Bildirimleri')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('switch', { name: /e-posta/i }));
    fireEvent.click(screen.getByRole('switch', { name: /push/i }));
    fireEvent.click(screen.getByText('Kaydet'));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/settings/emailEnabled', { value: true, type: 'boolean' });
      expect(api.put).toHaveBeenCalledWith('/settings/pushEnabled', { value: true, type: 'boolean' });
    });
  });

  it('renders notification channel section', async () => {
    (api.get as any).mockResolvedValue({ data: {} });
    render(<Settings />);
    fireEvent.click(screen.getByText('Bildirimler'));
    await waitFor(() => {
      expect(screen.getByText('Bildirim Kanalları')).toBeInTheDocument();
    });
    expect(screen.getByText('Önemli olaylar hakkında e-posta alın')).toBeInTheDocument();
    expect(screen.getByText('Tarayıcı push bildirimlerini etkinleştirin')).toBeInTheDocument();
  });

  it('renders notification types section', async () => {
    (api.get as any).mockResolvedValue({ data: {} });
    render(<Settings />);
    fireEvent.click(screen.getByText('Bildirimler'));
    await waitFor(() => {
      expect(screen.getByText('Bildirim Türleri')).toBeInTheDocument();
    });
    expect(screen.getByText('Makale başarıyla yayınlandığında bildirim alın')).toBeInTheDocument();
    expect(screen.getByText('Yayınlama başarısız olduğunda bildirim alın')).toBeInTheDocument();
    expect(screen.getByText('Yeni bir trend konu bulunduğunda bildirim alın')).toBeInTheDocument();
  });
});
