import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from '../pages/Settings';
import api from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock the auth store
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn((selector) => {
    const state = {
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
      },
      isAuthenticated: true,
      checkAuth: vi.fn().mockResolvedValue(undefined),
    };
    return selector(state);
  }),
}));

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe('Settings Page - Profile Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings page with profile tab active by default', () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Ayarlar' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Settings navigation' })).toBeInTheDocument();
    
    // Profile tab should be active by default
    expect(screen.getByRole('button', { name: /Profil/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: 'Profil Bilgileri' })).toBeInTheDocument();
  });

  it('displays user profile information correctly', () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    // Check name input has user name
    const nameInput = screen.getByLabelText(/İsim/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Test User');

    // Check email display
    const emailInput = screen.getByLabelText(/E-posta/i) as HTMLInputElement;
    expect(emailInput.value).toBe('test@example.com');
    expect(emailInput).toBeDisabled();
  });

  it('shows email as read-only with helper text', () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/E-posta/i);
    expect(emailInput).toBeDisabled();
    expect(screen.getByText(/E-posta adresi değiştirilemez/i)).toBeInTheDocument();
  });

  it('allows updating the name field', async () => {
    mockApi.patch.mockResolvedValueOnce({
      data: {
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Updated Name',
          role: 'admin',
        },
        message: 'Profil güncellendi',
      },
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const nameInput = screen.getByLabelText(/İsim/i);
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

    const saveButton = screen.getByRole('button', { name: /Profili Kaydet/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith('/auth/profile', { name: 'Updated Name' });
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Profil güncellendi/i);
    });
  });

  it('disables profile save button when name is unchanged', () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const saveButton = screen.getByRole('button', { name: /Profili Kaydet/i });
    expect(saveButton).toBeDisabled();
  });

  it('displays password change section with all fields', () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Şifre Değiştir' })).toBeInTheDocument();
    
    expect(screen.getByLabelText(/Mevcut Şifre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Yeni Şifre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Yeni Şifre \(Tekrar\)/i)).toBeInTheDocument();
    
    // Check helper text for password requirements
    expect(screen.getByText(/En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam/i)).toBeInTheDocument();
  });

  it('allows changing password with valid inputs', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { message: 'Şifre başarıyla değiştirildi' },
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Mevcut Şifre/i), {
      target: { value: 'CurrentPass123' },
    });
    fireEvent.change(screen.getByLabelText(/Yeni Şifre/i), {
      target: { value: 'NewPass123' },
    });
    fireEvent.change(screen.getByLabelText(/Yeni Şifre \(Tekrar\)/i), {
      target: { value: 'NewPass123' },
    });

    const changePasswordButton = screen.getByRole('button', { name: /Şifreyi Değiştir/i });
    fireEvent.click(changePasswordButton);

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'CurrentPass123',
        newPassword: 'NewPass123',
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Şifre başarıyla değiştirildi/i)).toBeInTheDocument();
    });
  });

  it('shows error when new passwords do not match', async () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Mevcut Şifre/i), {
      target: { value: 'CurrentPass123' },
    });
    fireEvent.change(screen.getByLabelText(/Yeni Şifre/i), {
      target: { value: 'NewPass123' },
    });
    fireEvent.change(screen.getByLabelText(/Yeni Şifre \(Tekrar\)/i), {
      target: { value: 'DifferentPass123' },
    });

    const changePasswordButton = screen.getByRole('button', { name: /Şifreyi Değiştir/i });
    fireEvent.click(changePasswordButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Yeni şifreler eşleşmiyor/i);
    });

    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('shows error when new password is too short', async () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Mevcut Şifre/i), {
      target: { value: 'CurrentPass123' },
    });
    fireEvent.change(screen.getByLabelText(/Yeni Şifre/i), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText(/Yeni Şifre \(Tekrar\)/i), {
      target: { value: 'short' },
    });

    const changePasswordButton = screen.getByRole('button', { name: /Şifreyi Değiştir/i });
    fireEvent.click(changePasswordButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Yeni şifre en az 8 karakter olmalıdır/i);
    });

    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('disables password change button when fields are empty', () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const changePasswordButton = screen.getByRole('button', { name: /Şifreyi Değiştir/i });
    expect(changePasswordButton).toBeDisabled();
  });

  it('shows error message when profile update fails', async () => {
    mockApi.patch.mockRejectedValueOnce({
      response: { data: { error: 'Güncelleme başarısız' } },
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const nameInput = screen.getByLabelText(/İsim/i);
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    const saveButton = screen.getByRole('button', { name: /Profili Kaydet/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Güncelleme başarısız/i);
    });
  });

  it('shows error message when password change fails', async () => {
    mockApi.post.mockRejectedValueOnce({
      response: { data: { error: 'Mevcut şifre yanlış' } },
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Mevcut Şifre/i), {
      target: { value: 'WrongPass123' },
    });
    fireEvent.change(screen.getByLabelText(/Yeni Şifre/i), {
      target: { value: 'NewPass123' },
    });
    fireEvent.change(screen.getByLabelText(/Yeni Şifre \(Tekrar\)/i), {
      target: { value: 'NewPass123' },
    });

    const changePasswordButton = screen.getByRole('button', { name: /Şifreyi Değiştir/i });
    fireEvent.click(changePasswordButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Mevcut şifre yanlış/i);
    });
  });

  it('clears password fields after successful password change', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { message: 'Şifre başarıyla değiştirildi' },
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const currentPasswordInput = screen.getByLabelText(/Mevcut Şifre/i) as HTMLInputElement;
    const newPasswordInput = screen.getByLabelText(/Yeni Şifre/i) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(/Yeni Şifre \(Tekrar\)/i) as HTMLInputElement;

    fireEvent.change(currentPasswordInput, { target: { value: 'CurrentPass123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'NewPass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPass123' } });

    const changePasswordButton = screen.getByRole('button', { name: /Şifreyi Değiştir/i });
    fireEvent.click(changePasswordButton);

    await waitFor(() => {
      expect(screen.getByText(/Şifre başarıyla değiştirildi/i)).toBeInTheDocument();
    });

    // Fields should be cleared
    expect(currentPasswordInput.value).toBe('');
    expect(newPasswordInput.value).toBe('');
    expect(confirmPasswordInput.value).toBe('');
  });

  it('switches between tabs correctly', () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    // Default is profile
    expect(screen.getByRole('heading', { name: 'Profil Bilgileri' })).toBeInTheDocument();

    // Click General tab
    fireEvent.click(screen.getByRole('button', { name: /Genel/i }));
    expect(screen.getByRole('heading', { name: 'Genel Ayarlar' })).toBeInTheDocument();

    // Click Notifications tab
    fireEvent.click(screen.getByRole('button', { name: /Bildirimler/i }));
    expect(screen.getByRole('heading', { name: 'Bildirim Ayarları' })).toBeInTheDocument();

    // Click Security tab
    fireEvent.click(screen.getByRole('button', { name: /Güvenlik/i }));
    expect(screen.getByRole('heading', { name: 'Güvenlik Ayarları' })).toBeInTheDocument();

    // Click back to Profile
    fireEvent.click(screen.getByRole('button', { name: /Profil/i }));
    expect(screen.getByRole('heading', { name: 'Profil Bilgileri' })).toBeInTheDocument();
  });
});
