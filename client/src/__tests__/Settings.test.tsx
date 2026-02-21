import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from '../pages/Settings';
import api from '../services/api';
import * as authStore from '../store/authStore';

// Mock the API
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
  useAuthStore: vi.fn(),
}));

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

const mockCheckAuth = vi.fn();

const createMockAuthStore = (user: { id: number; email: string; name: string; role: string } | null) => ({
  user,
  isAuthenticated: !!user,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  checkAuth: mockCheckAuth,
});

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock with a logged-in user
    vi.mocked(authStore.useAuthStore).mockReturnValue(
      createMockAuthStore({ id: 1, email: 'test@example.com', name: 'Test User', role: 'user' })
    );
  });

  describe('Profile Tab', () => {
    it('renders Profile tab by default', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Profil Bilgileri' })).toBeInTheDocument();
      });
    });

    it('displays name input field', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('İsim')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText('İsim') as HTMLInputElement;
      expect(nameInput.value).toBe('Test User');
    });

    it('displays email as read-only', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('E-posta')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText('E-posta') as HTMLInputElement;
      expect(emailInput.value).toBe('test@example.com');
      expect(emailInput).toBeDisabled();
    });

    it('shows email cannot be changed message', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('E-posta adresi değiştirilemez')).toBeInTheDocument();
      });
    });

    it('displays password change section', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Şifre Değiştir' })).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Mevcut Şifre')).toBeInTheDocument();
      expect(screen.getByLabelText('Yeni Şifre')).toBeInTheDocument();
      expect(screen.getByLabelText('Yeni Şifre (Tekrar)')).toBeInTheDocument();
    });

    it('displays change password button', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Şifreyi Değiştir' })).toBeInTheDocument();
      });
    });

    it('saves profile via API when form is submitted', async () => {
      mockApi.get.mockResolvedValue({ data: {} });
      mockApi.patch.mockResolvedValue({ data: { message: 'Profil güncellendi' } });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('İsim')).toBeInTheDocument();
      });

      // Change the name
      const nameInput = screen.getByLabelText('İsim');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      // Click save button
      const saveButton = screen.getByRole('button', { name: 'Profili Kaydet' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockApi.patch).toHaveBeenCalledWith('/auth/profile', { name: 'Updated Name' });
      });

      expect(mockCheckAuth).toHaveBeenCalled();
    });

    it('shows success message after profile update', async () => {
      mockApi.get.mockResolvedValue({ data: {} });
      mockApi.patch.mockResolvedValue({ data: { message: 'Profil güncellendi' } });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('İsim')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText('İsim');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      const saveButton = screen.getByRole('button', { name: 'Profili Kaydet' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Profil güncellendi')).toBeInTheDocument();
      });
    });

    it('shows error message when profile update fails', async () => {
      mockApi.get.mockResolvedValue({ data: {} });
      mockApi.patch.mockRejectedValue({ response: { data: { error: 'Güncelleme başarısız' } } });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('İsim')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText('İsim');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      const saveButton = screen.getByRole('button', { name: 'Profili Kaydet' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Güncelleme başarısız')).toBeInTheDocument();
      });
    });

    it('changes password via API when form is submitted', async () => {
      mockApi.get.mockResolvedValue({ data: {} });
      mockApi.post.mockResolvedValue({ data: { message: 'Şifre değiştirildi' } });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Mevcut Şifre')).toBeInTheDocument();
      });

      // Fill in password fields
      fireEvent.change(screen.getByLabelText('Mevcut Şifre'), { target: { value: 'oldpass123' } });
      fireEvent.change(screen.getByLabelText('Yeni Şifre'), { target: { value: 'newpass123' } });
      fireEvent.change(screen.getByLabelText('Yeni Şifre (Tekrar)'), { target: { value: 'newpass123' } });

      // Click change password button
      const changeButton = screen.getByRole('button', { name: 'Şifreyi Değiştir' });
      fireEvent.click(changeButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/auth/change-password', {
          currentPassword: 'oldpass123',
          newPassword: 'newpass123',
        });
      });
    });

    it('shows error when new passwords do not match', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Mevcut Şifre')).toBeInTheDocument();
      });

      // Fill in password fields with mismatch
      fireEvent.change(screen.getByLabelText('Mevcut Şifre'), { target: { value: 'oldpass123' } });
      fireEvent.change(screen.getByLabelText('Yeni Şifre'), { target: { value: 'newpass123' } });
      fireEvent.change(screen.getByLabelText('Yeni Şifre (Tekrar)'), { target: { value: 'different123' } });

      const changeButton = screen.getByRole('button', { name: 'Şifreyi Değiştir' });
      fireEvent.click(changeButton);

      await waitFor(() => {
        expect(screen.getByText('Yeni şifreler eşleşmiyor')).toBeInTheDocument();
      });

      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('shows error when new password is too short', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Mevcut Şifre')).toBeInTheDocument();
      });

      // Fill in password fields with short password
      fireEvent.change(screen.getByLabelText('Mevcut Şifre'), { target: { value: 'oldpass123' } });
      fireEvent.change(screen.getByLabelText('Yeni Şifre'), { target: { value: 'short' } });
      fireEvent.change(screen.getByLabelText('Yeni Şifre (Tekrar)'), { target: { value: 'short' } });

      const changeButton = screen.getByRole('button', { name: 'Şifreyi Değiştir' });
      fireEvent.click(changeButton);

      await waitFor(() => {
        expect(screen.getByText('Yeni şifre en az 8 karakter olmalıdır')).toBeInTheDocument();
      });

      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('disables profile save button when no changes made', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('İsim')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: 'Profili Kaydet' });
      expect(saveButton).toBeDisabled();
    });

    it('disables password change button when fields are empty', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Şifreyi Değiştir' })).toBeInTheDocument();
      });

      const changeButton = screen.getByRole('button', { name: 'Şifreyi Değiştir' });
      expect(changeButton).toBeDisabled();
    });
  });

  describe('Navigation', () => {
    it('renders all tabs', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Profil' })).toBeInTheDocument();
      });

      expect(screen.getByRole('tab', { name: 'Genel' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Bildirimler' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Güvenlik' })).toBeInTheDocument();
    });

    it('switches to General tab when clicked', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Genel' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('tab', { name: 'Genel' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Genel Ayarlar' })).toBeInTheDocument();
      });
    });

    it('switches to Notifications tab when clicked', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Bildirimler' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('tab', { name: 'Bildirimler' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Bildirim Ayarları' })).toBeInTheDocument();
      });
    });

    it('switches to Security tab when clicked', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Güvenlik' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('tab', { name: 'Güvenlik' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Güvenlik Ayarları' })).toBeInTheDocument();
      });
    });
  });
});
