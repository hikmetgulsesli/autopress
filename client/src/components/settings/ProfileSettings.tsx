import { useState, useEffect } from 'react';
import { User, Lock, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface ProfileFormData {
  name: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
}

interface FormErrors {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
  general?: string;
}

export default function ProfileSettings() {
  const { user, checkAuth } = useAuthStore();
  
  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: user?.name || '',
  });
  
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Update form when user data loads
  useEffect(() => {
    if (user?.name) {
      setProfileData({ name: user.name });
    }
  }, [user]);

  const validateProfile = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!profileData.name.trim()) {
      newErrors.name = 'İsim gerekli';
    } else if (profileData.name.length > 100) {
      newErrors.name = 'İsim çok uzun (max 100 karakter)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Mevcut şifre gerekli';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'Yeni şifre gerekli';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Yeni şifre en az 8 karakter olmalıdır';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateProfile()) return;
    
    setIsProfileSaving(true);
    setProfileSuccess(false);
    setErrors({});
    
    try {
      await api.put('/auth/profile', { name: profileData.name });
      setProfileSuccess(true);
      // Refresh user data in store
      await checkAuth();
      // Hide success message after 3 seconds
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setErrors({
        general: err.response?.data?.error || 'Profil güncellenirken bir hata oluştu',
      });
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) return;
    
    setIsPasswordSaving(true);
    setPasswordSuccess(false);
    setErrors({});
    
    try {
      await api.put('/auth/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordSuccess(true);
      // Clear password fields
      setPasswordData({ currentPassword: '', newPassword: '' });
      // Hide success message after 3 seconds
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Şifre değiştirilirken bir hata oluştu';
      if (errorMessage.includes('şifre') || errorMessage.includes('password')) {
        setErrors({ currentPassword: errorMessage });
      } else {
        setErrors({ general: errorMessage });
      }
    } finally {
      setIsPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Information Section */}
      <section className="bg-surface-alt rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
            <User className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text">Profil Bilgileri</h3>
            <p className="text-sm text-text-muted">Kişisel bilgilerinizi güncelleyin</p>
          </div>
        </div>

        {profileSuccess && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-400 text-sm">Profil bilgileriniz başarıyla güncellendi</p>
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-muted mb-2">
                Ad Soyad
              </label>
              <input
                type="text"
                id="name"
                value={profileData.name}
                onChange={(e) => setProfileData({ name: e.target.value })}
                className={`w-full px-4 py-2.5 bg-surface-alt border border-border rounded-lg text-text placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all ${
                  errors.name ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary-400'
                }`}
                placeholder="Adınızı girin"
                autoComplete="name"
              />
              {errors.name && (
                <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email Field (Read-only) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-muted mb-2">
                Email Adresi
              </label>
              <input
                type="email"
                id="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2.5 bg-surface-alt/50 border border-border rounded-lg text-text-muted cursor-not-allowed"
                placeholder="email@example.com"
              />
              <p className="mt-1.5 text-xs text-text-subtle">Email adresi değiştirilemez</p>
            </div>
          </div>

          {errors.general && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{errors.general}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isProfileSaving}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-alt disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {isProfileSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                'Profili Kaydet'
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Change Password Section */}
      <section className="bg-surface-alt rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text">Şifre Değiştir</h3>
            <p className="text-sm text-text-muted">Hesap güvenliğiniz için şifrenizi düzenli olarak değiştirin</p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-400 text-sm">Şifreniz başarıyla değiştirildi</p>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Password Field */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-text-muted mb-2">
                Mevcut Şifre
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  id="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className={`w-full px-4 py-2.5 bg-surface-alt border border-border rounded-lg text-text placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all pr-10 ${
                    errors.currentPassword ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary-400'
                  }`}
                  placeholder="Mevcut şifrenizi girin"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                  aria-label={showCurrentPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.currentPassword}
                </p>
              )}
            </div>

            {/* New Password Field */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-text-muted mb-2">
                Yeni Şifre
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className={`w-full px-4 py-2.5 bg-surface-alt border border-border rounded-lg text-text placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all pr-10 ${
                    errors.newPassword ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary-400'
                  }`}
                  placeholder="Yeni şifrenizi girin"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                  aria-label={showNewPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.newPassword}
                </p>
              )}
              <p className="mt-1.5 text-xs text-text-subtle">En az 8 karakter olmalıdır</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPasswordSaving}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-alt disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {isPasswordSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Değiştiriliyor...
                </>
              ) : (
                'Şifreyi Değiştir'
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
