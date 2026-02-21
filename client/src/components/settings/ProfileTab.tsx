import { useState, useEffect } from 'react';
import { User, Mail, Lock, Eye, EyeOff, Save, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function ProfileTab() {
  const { user, checkAuth } = useAuthStore();
  
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name || '', email: user.email || '' });
    }
  }, [user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setProfileError('');
    setProfileSuccess(false);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setPasswordError('');
    setPasswordSuccess(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileError('');
    setProfileSuccess(false);
    try {
      await api.put('/auth/profile', { name: profile.name });
      await checkAuth();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.response?.data?.error?.message || 'Profil güncellenirken bir hata oluştu');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    if (password.newPassword !== password.confirmPassword) {
      setPasswordError('Yeni şifreler eşleşmiyor');
      return;
    }
    if (password.newPassword.length < 6) {
      setPasswordError('Yeni şifre en az 6 karakter olmalıdır');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword: password.currentPassword, newPassword: password.newPassword });
      setPasswordSuccess(true);
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.error?.message || 'Şifre değiştirilirken bir hata oluştu');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl p-6" style={{ backgroundColor: 'rgba(39, 39, 42, 0.5)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)' }}>
            <User className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Profil Bilgileri</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Kişisel bilgilerinizi yönetin</p>
          </div>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Ad Soyad</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-subtle)' }} />
                <input type="text" id="name" name="name" value={profile.name} onChange={handleProfileChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg focus:outline-none transition-colors"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  placeholder="Adınızı girin" autoComplete="name" />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-subtle)' }} />
                <input type="email" id="email" name="email" value={profile.email} readOnly disabled
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg cursor-not-allowed"
                  style={{ backgroundColor: 'rgba(24, 24, 27, 0.5)', border: '1px solid var(--color-border)', color: 'var(--color-text-subtle)' }}
                  autoComplete="email" />
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>E-posta adresi değiştirilemez</p>
            </div>
          </div>
          {profileError && <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)', color: 'var(--color-error)' }}>{profileError}</div>}
          {profileSuccess && <div className="p-3 rounded-lg text-sm flex items-center gap-2" style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', color: 'var(--color-success)' }}><CheckCircle2 className="w-4 h-4" />Profil başarıyla güncellendi</div>}
          <div className="flex justify-end">
            <button type="submit" disabled={isSavingProfile}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed cursor-pointer"
              style={{ backgroundColor: isSavingProfile ? 'var(--color-border)' : 'var(--color-primary-600)', color: 'white' }}
              onMouseEnter={(e) => !isSavingProfile && (e.currentTarget.style.backgroundColor = 'var(--color-primary-500)')}
              onMouseLeave={(e) => !isSavingProfile && (e.currentTarget.style.backgroundColor = 'var(--color-primary-600)')}>
              {isSavingProfile ? <><Loader2 className="w-4 h-4 animate-spin" />Kaydediliyor...</> : <><Save className="w-4 h-4" />Değişiklikleri Kaydet</>}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl p-6" style={{ backgroundColor: 'rgba(39, 39, 42, 0.5)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(132, 204, 22, 0.2)' }}>
            <Lock className="w-5 h-5" style={{ color: 'var(--color-accent-400)' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Şifre Değiştir</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Hesap güvenliğiniz için şifrenizi düzenli olarak değiştirin</p>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="currentPassword" className="block text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Mevcut Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-subtle)' }} />
                <input type={showCurrentPassword ? 'text' : 'password'} id="currentPassword" name="currentPassword" value={password.currentPassword} onChange={handlePasswordChange}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg focus:outline-none transition-colors"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  placeholder="Mevcut şifrenizi girin" autoComplete="current-password" />
                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer" style={{ color: 'var(--color-text-subtle)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-subtle)'}
                  aria-label={showCurrentPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}>
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="newPassword" className="block text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Yeni Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-subtle)' }} />
                <input type={showNewPassword ? 'text' : 'password'} id="newPassword" name="newPassword" value={password.newPassword} onChange={handlePasswordChange}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg focus:outline-none transition-colors"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  placeholder="Yeni şifrenizi girin" autoComplete="new-password" />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer" style={{ color: 'var(--color-text-subtle)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-subtle)'}
                  aria-label={showNewPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}>
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>En az 6 karakter olmalıdır</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Yeni Şifre (Tekrar)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-subtle)' }} />
                <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" name="confirmPassword" value={password.confirmPassword} onChange={handlePasswordChange}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg focus:outline-none transition-colors"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  placeholder="Yeni şifrenizi tekrar girin" autoComplete="new-password" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer" style={{ color: 'var(--color-text-subtle)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-subtle)'}
                  aria-label={showConfirmPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}>
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
          {passwordError && <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)', color: 'var(--color-error)' }}>{passwordError}</div>}
          {passwordSuccess && <div className="p-3 rounded-lg text-sm flex items-center gap-2" style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', color: 'var(--color-success)' }}><CheckCircle2 className="w-4 h-4" />Şifre başarıyla değiştirildi</div>}
          <div className="flex justify-end">
            <button type="submit" disabled={isChangingPassword}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed cursor-pointer"
              style={{ backgroundColor: isChangingPassword ? 'var(--color-border)' : 'var(--color-accent-600)', color: 'white' }}
              onMouseEnter={(e) => !isChangingPassword && (e.currentTarget.style.backgroundColor = 'var(--color-accent-500)')}
              onMouseLeave={(e) => !isChangingPassword && (e.currentTarget.style.backgroundColor = 'var(--color-accent-600)')}>
              {isChangingPassword ? <><Loader2 className="w-4 h-4 animate-spin" />Değiştiriliyor...</> : <><Lock className="w-4 h-4" />Şifreyi Değiştir</>}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
