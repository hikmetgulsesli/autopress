import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileSettings from '../components/settings/ProfileSettings';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

// Mock the auth store
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock the API
vi.mock('../services/api', () => ({
  default: {
    put: vi.fn(),
  },
}));

const mockCheckAuth = vi.fn();

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin',
};

describe('ProfileSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as any).mockReturnValue({
      user: mockUser,
      checkAuth: mockCheckAuth,
    });
  });

  describe('Profile Information Section', () => {
    it('renders profile information section', () => {
      render(<ProfileSettings />);
      
      expect(screen.getByText('Profil Bilgileri')).toBeInTheDocument();
      expect(screen.getByText('Kişisel bilgilerinizi güncelleyin')).toBeInTheDocument();
    });

    it('renders name input field with user data', () => {
      render(<ProfileSettings />);
      
      const nameInput = screen.getByLabelText('Ad Soyad');
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveValue('Test User');
    });

    it('renders email display as read-only', () => {
      render(<ProfileSettings />);
      
      const emailInput = screen.getByLabelText('Email Adresi');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveValue('test@example.com');
      expect(emailInput).toBeDisabled();
    });

    it('shows email cannot be changed message', () => {
      render(<ProfileSettings />);
      
      expect(screen.getByText('Email adresi değiştirilemez')).toBeInTheDocument();
    });

    it('validates name field is required', async () => {
      render(<ProfileSettings />);
      
      const nameInput = screen.getByLabelText('Ad Soyad');
      fireEvent.change(nameInput, { target: { value: '' } });
      
      const saveButton = screen.getByRole('button', { name: /profili kaydet/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('İsim gerekli')).toBeInTheDocument();
      });
    });

    it('validates name field max length', async () => {
      render(<ProfileSettings />);
      
      const nameInput = screen.getByLabelText('Ad Soyad');
      fireEvent.change(nameInput, { target: { value: 'a'.repeat(101) } });
      
      const saveButton = screen.getByRole('button', { name: /profili kaydet/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('İsim çok uzun (max 100 karakter)')).toBeInTheDocument();
      });
    });

    it('calls API to save profile on valid submit', async () => {
      (api.put as any).mockResolvedValueOnce({ data: { ...mockUser, name: 'Updated Name' } });
      
      render(<ProfileSettings />);
      
      const nameInput = screen.getByLabelText('Ad Soyad');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      const saveButton = screen.getByRole('button', { name: /profili kaydet/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith('/auth/profile', { name: 'Updated Name' });
      });
    });

    it('shows success message after profile update', async () => {
      (api.put as any).mockResolvedValueOnce({ data: { ...mockUser, name: 'Updated Name' } });
      
      render(<ProfileSettings />);
      
      const nameInput = screen.getByLabelText('Ad Soyad');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      const saveButton = screen.getByRole('button', { name: /profili kaydet/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Profil bilgileriniz başarıyla güncellendi')).toBeInTheDocument();
      });
    });

    it('calls checkAuth after successful profile update', async () => {
      (api.put as any).mockResolvedValueOnce({ data: { ...mockUser, name: 'Updated Name' } });
      
      render(<ProfileSettings />);
      
      const nameInput = screen.getByLabelText('Ad Soyad');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      const saveButton = screen.getByRole('button', { name: /profili kaydet/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockCheckAuth).toHaveBeenCalled();
      });
    });

    it('shows error message on API failure', async () => {
      (api.put as any).mockRejectedValueOnce({
        response: { data: { error: 'Profil güncellenemedi' } },
      });
      
      render(<ProfileSettings />);
      
      const nameInput = screen.getByLabelText('Ad Soyad');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      const saveButton = screen.getByRole('button', { name: /profili kaydet/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Profil güncellenemedi')).toBeInTheDocument();
      });
    });

    it('disables save button while submitting', async () => {
      (api.put as any).mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<ProfileSettings />);
      
      const nameInput = screen.getByLabelText('Ad Soyad');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      const saveButton = screen.getByRole('button', { name: /profili kaydet/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(saveButton).toBeDisabled();
        expect(screen.getByText('Kaydediliyor...')).toBeInTheDocument();
      });
    });
  });

  describe('Change Password Section', () => {
    it('renders change password section', () => {
      render(<ProfileSettings />);
      
      expect(screen.getByText('Şifre Değiştir')).toBeInTheDocument();
      expect(screen.getByText('Hesap güvenliğiniz için şifrenizi düzenli olarak değiştirin')).toBeInTheDocument();
    });

    it('renders current password input field', () => {
      render(<ProfileSettings />);
      
      expect(screen.getByLabelText('Mevcut Şifre')).toBeInTheDocument();
    });

    it('renders new password input field', () => {
      render(<ProfileSettings />);
      
      expect(screen.getByLabelText('Yeni Şifre')).toBeInTheDocument();
    });

    it('shows password requirements hint', () => {
      render(<ProfileSettings />);
      
      expect(screen.getByText('En az 8 karakter olmalıdır')).toBeInTheDocument();
    });

    it('validates current password is required', async () => {
      render(<ProfileSettings />);
      
      const newPasswordInput = screen.getByLabelText('Yeni Şifre');
      fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
      
      const changeButton = screen.getByRole('button', { name: /şifreyi değiştir/i });
      fireEvent.click(changeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Mevcut şifre gerekli')).toBeInTheDocument();
      });
    });

    it('validates new password is required', async () => {
      render(<ProfileSettings />);
      
      const currentPasswordInput = screen.getByLabelText('Mevcut Şifre');
      fireEvent.change(currentPasswordInput, { target: { value: 'currentpassword' } });
      
      const changeButton = screen.getByRole('button', { name: /şifreyi değiştir/i });
      fireEvent.click(changeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Yeni şifre gerekli')).toBeInTheDocument();
      });
    });

    it('validates new password minimum length', async () => {
      render(<ProfileSettings />);
      
      const currentPasswordInput = screen.getByLabelText('Mevcut Şifre');
      fireEvent.change(currentPasswordInput, { target: { value: 'currentpassword' } });
      
      const newPasswordInput = screen.getByLabelText('Yeni Şifre');
      fireEvent.change(newPasswordInput, { target: { value: 'short' } });
      
      const changeButton = screen.getByRole('button', { name: /şifreyi değiştir/i });
      fireEvent.click(changeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Yeni şifre en az 8 karakter olmalıdır')).toBeInTheDocument();
      });
    });

    it('calls API to change password on valid submit', async () => {
      (api.put as any).mockResolvedValueOnce({ data: { message: 'Şifre başarıyla değiştirildi' } });
      
      render(<ProfileSettings />);
      
      const currentPasswordInput = screen.getByLabelText('Mevcut Şifre');
      fireEvent.change(currentPasswordInput, { target: { value: 'currentpassword' } });
      
      const newPasswordInput = screen.getByLabelText('Yeni Şifre');
      fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
      
      const changeButton = screen.getByRole('button', { name: /şifreyi değiştir/i });
      fireEvent.click(changeButton);
      
      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith('/auth/password', {
          currentPassword: 'currentpassword',
          newPassword: 'newpassword123',
        });
      });
    });

    it('shows success message after password change', async () => {
      (api.put as any).mockResolvedValueOnce({ data: { message: 'Şifre başarıyla değiştirildi' } });
      
      render(<ProfileSettings />);
      
      const currentPasswordInput = screen.getByLabelText('Mevcut Şifre');
      fireEvent.change(currentPasswordInput, { target: { value: 'currentpassword' } });
      
      const newPasswordInput = screen.getByLabelText('Yeni Şifre');
      fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
      
      const changeButton = screen.getByRole('button', { name: /şifreyi değiştir/i });
      fireEvent.click(changeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Şifreniz başarıyla değiştirildi')).toBeInTheDocument();
      });
    });

    it('clears password fields after successful change', async () => {
      (api.put as any).mockResolvedValueOnce({ data: { message: 'Şifre başarıyla değiştirildi' } });
      
      render(<ProfileSettings />);
      
      const currentPasswordInput = screen.getByLabelText('Mevcut Şifre');
      fireEvent.change(currentPasswordInput, { target: { value: 'currentpassword' } });
      
      const newPasswordInput = screen.getByLabelText('Yeni Şifre');
      fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
      
      const changeButton = screen.getByRole('button', { name: /şifreyi değiştir/i });
      fireEvent.click(changeButton);
      
      await waitFor(() => {
        expect(currentPasswordInput).toHaveValue('');
        expect(newPasswordInput).toHaveValue('');
      });
    });

    it('shows error for incorrect current password', async () => {
      (api.put as any).mockRejectedValueOnce({
        response: { data: { error: 'Mevcut şifre yanlış' } },
      });
      
      render(<ProfileSettings />);
      
      const currentPasswordInput = screen.getByLabelText('Mevcut Şifre');
      fireEvent.change(currentPasswordInput, { target: { value: 'wrongpassword' } });
      
      const newPasswordInput = screen.getByLabelText('Yeni Şifre');
      fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
      
      const changeButton = screen.getByRole('button', { name: /şifreyi değiştir/i });
      fireEvent.click(changeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Mevcut şifre yanlış')).toBeInTheDocument();
      });
    });

    it('toggles password visibility for current password', () => {
      render(<ProfileSettings />);
      
      const currentPasswordInput = screen.getByLabelText('Mevcut Şifre');
      const toggleButtons = screen.getAllByLabelText('Şifreyi göster');
      
      expect(currentPasswordInput).toHaveAttribute('type', 'password');
      
      fireEvent.click(toggleButtons[0]);
      
      expect(currentPasswordInput).toHaveAttribute('type', 'text');
      
      fireEvent.click(screen.getByLabelText('Şifreyi gizle'));
      
      expect(currentPasswordInput).toHaveAttribute('type', 'password');
    });

    it('toggles password visibility for new password', () => {
      render(<ProfileSettings />);
      
      const newPasswordInput = screen.getByLabelText('Yeni Şifre');
      const toggleButtons = screen.getAllByLabelText('Şifreyi göster');
      
      expect(newPasswordInput).toHaveAttribute('type', 'password');
      
      fireEvent.click(toggleButtons[1]);
      
      expect(newPasswordInput).toHaveAttribute('type', 'text');
    });

    it('disables change button while submitting', async () => {
      (api.put as any).mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<ProfileSettings />);
      
      const currentPasswordInput = screen.getByLabelText('Mevcut Şifre');
      fireEvent.change(currentPasswordInput, { target: { value: 'currentpassword' } });
      
      const newPasswordInput = screen.getByLabelText('Yeni Şifre');
      fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
      
      const changeButton = screen.getByRole('button', { name: /şifreyi değiştir/i });
      fireEvent.click(changeButton);
      
      await waitFor(() => {
        expect(changeButton).toBeDisabled();
        expect(screen.getByText('Değiştiriliyor...')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has correct heading structure', () => {
      render(<ProfileSettings />);
      
      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(2);
      expect(headings[0]).toHaveTextContent('Profil Bilgileri');
      expect(headings[1]).toHaveTextContent('Şifre Değiştir');
    });

    it('associates labels with inputs correctly', () => {
      render(<ProfileSettings />);
      
      expect(screen.getByLabelText('Ad Soyad')).toHaveAttribute('id', 'name');
      expect(screen.getByLabelText('Email Adresi')).toHaveAttribute('id', 'email');
      expect(screen.getByLabelText('Mevcut Şifre')).toHaveAttribute('id', 'currentPassword');
      expect(screen.getByLabelText('Yeni Şifre')).toHaveAttribute('id', 'newPassword');
    });

    it('has correct autocomplete attributes', () => {
      render(<ProfileSettings />);
      
      expect(screen.getByLabelText('Ad Soyad')).toHaveAttribute('autocomplete', 'name');
      expect(screen.getByLabelText('Mevcut Şifre')).toHaveAttribute('autocomplete', 'current-password');
      expect(screen.getByLabelText('Yeni Şifre')).toHaveAttribute('autocomplete', 'new-password');
    });
  });
});
