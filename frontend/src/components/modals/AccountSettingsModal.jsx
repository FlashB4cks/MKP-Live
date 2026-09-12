import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  Shield,
  Info,
  Trash2,
  Camera,
  Check,
  AlertCircle,
  Copy,
  CheckCircle2,
  Lock,
  Mail,
  Smile,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getMediaUrl } from '../../utils/media';

export default function AccountSettingsModal({ isOpen, onClose }) {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const changePassword = useAuthStore((state) => state.changePassword);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const logout = useAuthStore((state) => state.logout);

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'details' | 'danger'

  // Profile Form States
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [statusText, setStatusText] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const avatarInputRef = useRef(null);

  // Security Form States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState(null);
  const [securitySuccess, setSecuritySuccess] = useState(null);

  // Danger Zone States
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Copy UUID
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setStatusText(user.status_text || '');
      setAvatarPreview(getMediaUrl(user.avatar_url || user.avatar) || null);
      setAvatarFile(null);
      setRemoveAvatar(false);
      setProfileError(null);
      setProfileSuccess(null);
      setSecurityError(null);
      setSecuritySuccess(null);
      setDeleteError(null);
      setDeleteConfirmOpen(false);
      setOldPassword('');
      setNewPassword('');
      setNewPassword2('');
      setDeletePassword('');
    }
  }, [user, isOpen]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  // Handle Avatar file pick
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setRemoveAvatar(false);
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  // Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);

    const formData = new FormData();
    formData.append('username', username.trim());
    formData.append('email', email.trim());
    formData.append('bio', bio);
    formData.append('status_text', statusText.trim());

    if (avatarFile) {
      formData.append('avatar', avatarFile);
    } else if (removeAvatar) {
      formData.append('remove_avatar', 'true');
    }

    const res = await updateProfile(formData);
    setProfileLoading(false);

    if (res.success) {
      setProfileSuccess('Perfil actualizado exitosamente.');
      setTimeout(() => setProfileSuccess(null), 3500);
    } else {
      setProfileError(res.error);
    }
  };

  // Change Password
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !newPassword2) return;
    if (newPassword !== newPassword2) {
      setSecurityError('Las nuevas contraseñas no coinciden.');
      return;
    }

    setSecurityLoading(true);
    setSecurityError(null);
    setSecuritySuccess(null);

    const res = await changePassword(oldPassword, newPassword, newPassword2);
    setSecurityLoading(false);

    if (res.success) {
      setSecuritySuccess('Contraseña cambiada exitosamente.');
      setOldPassword('');
      setNewPassword('');
      setNewPassword2('');
      setTimeout(() => setSecuritySuccess(null), 3500);
    } else {
      setSecurityError(res.error);
    }
  };

  // Delete Account
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) return;

    setDeleteLoading(true);
    setDeleteError(null);

    const res = await deleteAccount(deletePassword);
    setDeleteLoading(false);

    if (res.success) {
      onClose();
    } else {
      setDeleteError(res.error);
    }
  };

  // Copy User ID
  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Desconocido';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-discord-chat border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[88dvh] max-h-[88dvh] sm:h-auto sm:max-h-[85vh] relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Mobile Top Bar: Single clean header with title and 1 close button */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-discord-sidebar border-b border-white/10 flex-shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-discord-blurple/20 text-discord-blurple flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white leading-tight truncate">
                Ajustes de Usuario
              </h3>
              <p className="text-[11px] text-discord-text-muted leading-tight truncate">
                @{user.username}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 -mr-1 rounded-xl flex items-center justify-center text-discord-text-muted hover:text-white hover:bg-white/10 active:scale-95 transition"
            title="Cerrar ajustes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Mobile Horizontal Tabs - 4-Column Grid that fits all screens without cutoff */}
        <div className="md:hidden grid grid-cols-4 gap-1 p-2 bg-discord-sidebar/80 border-b border-white/5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`min-h-[38px] flex flex-col xs:flex-row items-center justify-center gap-1 px-1 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-discord-blurple text-white shadow-sm'
                : 'text-discord-text-muted hover:bg-white/5 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Perfil</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`min-h-[38px] flex flex-col xs:flex-row items-center justify-center gap-1 px-1 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all ${
              activeTab === 'security'
                ? 'bg-discord-blurple text-white shadow-sm'
                : 'text-discord-text-muted hover:bg-white/5 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Seguridad</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`min-h-[38px] flex flex-col xs:flex-row items-center justify-center gap-1 px-1 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all ${
              activeTab === 'details'
                ? 'bg-discord-blurple text-white shadow-sm'
                : 'text-discord-text-muted hover:bg-white/5 hover:text-white'
            }`}
          >
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Detalles</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('danger')}
            className={`min-h-[38px] flex flex-col xs:flex-row items-center justify-center gap-1 px-1 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all ${
              activeTab === 'danger'
                ? 'bg-discord-red text-white shadow-sm'
                : 'text-discord-red/80 hover:bg-discord-red/10 hover:text-discord-red'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Peligro</span>
          </button>
        </div>

        {/* 3. Desktop Left Sidebar Tabs */}
        <div className="hidden md:flex w-56 bg-discord-sidebar/95 border-r border-white/10 p-4 flex-col justify-between flex-shrink-0">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-discord-text-muted tracking-wider uppercase px-2 block mb-2">
              Ajustes de Usuario
            </span>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'profile'
                  ? 'bg-discord-blurple text-white shadow-sm'
                  : 'text-discord-text hover:bg-white/5 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Mi Perfil</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'security'
                  ? 'bg-discord-blurple text-white shadow-sm'
                  : 'text-discord-text hover:bg-white/5 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Seguridad</span>
            </button>

            <button
              onClick={() => setActiveTab('details')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'details'
                  ? 'bg-discord-blurple text-white shadow-sm'
                  : 'text-discord-text hover:bg-white/5 hover:text-white'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>Detalles</span>
            </button>

            <button
              onClick={() => setActiveTab('danger')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'danger'
                  ? 'bg-discord-red text-white shadow-sm'
                  : 'text-discord-red/80 hover:bg-discord-red/10 hover:text-discord-red'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Zona de Peligro</span>
            </button>
          </div>

          <div className="flex flex-col gap-1.5 pt-4 border-t border-white/10 mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-discord-text-muted hover:text-white hover:bg-white/5 transition"
              title="Cerrar ajustes"
            >
              <X className="w-4 h-4" />
              <span>Cerrar Ajustes</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-mono text-gray-300">ESC</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-discord-red hover:bg-discord-red/10 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* 4. Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-discord-chat overflow-hidden">
          {/* Header (Desktop only to prevent duplicate headers in mobile) */}
          <div className="hidden md:flex items-center justify-between p-4 border-b border-white/10 bg-discord-chat">
            <h3 className="text-sm sm:text-base font-bold text-white capitalize">
              {activeTab === 'profile' && 'Editar Perfil'}
              {activeTab === 'security' && 'Seguridad & Contraseña'}
              {activeTab === 'details' && 'Información de la Cuenta'}
              {activeTab === 'danger' && 'Eliminar Cuenta'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-discord-text-muted hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition group"
              title="Cerrar ajustes"
            >
              <span className="text-[11px] font-mono font-medium hidden sm:inline text-discord-text-muted group-hover:text-white">
                ESC
              </span>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* TAB 1: EDIT PROFILE */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {profileError && (
                  <div className="rounded-xl bg-discord-red/20 border border-discord-red/30 p-3 text-xs text-discord-red flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{profileError}</span>
                  </div>
                )}
                {profileSuccess && (
                  <div className="rounded-xl bg-discord-green/20 border border-discord-green/30 p-3 text-xs text-discord-green flex items-start gap-2">
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-4 border-b border-white/5 text-center sm:text-left">
                  <div className="relative group flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl sm:rounded-full bg-discord-blurple flex items-center justify-center text-3xl font-bold text-white overflow-hidden shadow-xl border-2 border-white/10">
                      {avatarPreview ? (
                        <img
                          src={getMediaUrl(avatarPreview)}
                          alt=""
                          onError={() => setAvatarPreview(null)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        username?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 rounded-2xl sm:rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title="Cambiar foto de perfil"
                    >
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px] font-bold">Cambiar</span>
                    </button>

                    <input
                      type="file"
                      ref={avatarInputRef}
                      onChange={handleAvatarChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="text-xs font-bold text-white">Foto de Perfil</div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="min-h-[40px] text-xs bg-white/10 hover:bg-white/15 text-white font-semibold px-3.5 py-2 rounded-xl transition active:scale-98"
                      >
                        Subir foto
                      </button>
                      {(avatarPreview || user.avatar_url) && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="min-h-[40px] text-xs text-discord-red hover:bg-discord-red/10 px-3 py-2 rounded-xl transition border border-discord-red/20 active:scale-98"
                        >
                          Quitar foto
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-discord-text-muted">
                      JPG, PNG o GIF. Recomendado formato cuadrado.
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-1.5">
                      Nombre de Usuario *
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full bg-discord-sidebar px-3.5 py-2 rounded-lg text-sm text-white placeholder-discord-text-muted/60 border border-white/10 focus:outline-none focus:border-discord-blurple transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-1.5">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-discord-sidebar px-3.5 py-2 rounded-lg text-sm text-white placeholder-discord-text-muted/60 border border-white/10 focus:outline-none focus:border-discord-blurple transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-1.5 flex items-center gap-1.5">
                    <Smile className="w-3.5 h-3.5" />
                    <span>Estado Personalizado</span>
                  </label>
                  <input
                    type="text"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    placeholder="Ej. En el trabajo, programando, etc."
                    maxLength={120}
                    className="w-full bg-discord-sidebar px-3.5 py-2 rounded-lg text-sm text-white placeholder-discord-text-muted/60 border border-white/10 focus:outline-none focus:border-discord-blurple transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-1.5">
                    Acerca de Mí
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Cuéntale un poco sobre ti a tu comunidad..."
                    className="w-full bg-discord-sidebar p-3 rounded-lg text-sm text-white placeholder-discord-text-muted/60 border border-white/10 focus:outline-none focus:border-discord-blurple transition resize-none"
                  />
                  <span className="text-[10px] text-discord-text-muted block text-right">
                    {bio.length}/500 caracteres
                  </span>
                </div>

                <div className="sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 px-4 py-3 sm:px-6 bg-discord-chat/95 backdrop-blur border-t border-white/10 flex justify-end z-10">
                  <button
                    type="submit"
                    disabled={profileLoading || !username.trim() || !email.trim()}
                    className="min-h-[42px] bg-discord-blurple hover:bg-discord-blurple-hover disabled:opacity-50 text-white text-xs sm:text-sm font-semibold px-6 py-2 rounded-xl transition shadow-lg flex items-center gap-2 active:scale-98 cursor-pointer"
                  >
                    {profileLoading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: SECURITY (CHANGE PASSWORD) */}
            {activeTab === 'security' && (
              <form onSubmit={handleSavePassword} className="space-y-4">
                <p className="text-xs text-discord-text-muted leading-relaxed">
                  Para mayor seguridad, te recomendamos usar una contraseña única que no utilices en otros servicios.
                </p>

                {securityError && (
                  <div className="rounded-xl bg-discord-red/20 border border-discord-red/30 p-3 text-xs text-discord-red flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{securityError}</span>
                  </div>
                )}
                {securitySuccess && (
                  <div className="rounded-xl bg-discord-green/20 border border-discord-green/30 p-3 text-xs text-discord-green flex items-start gap-2">
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{securitySuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-1.5">
                    Contraseña Actual *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-discord-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                      placeholder="Ingresa tu contraseña actual"
                      className="w-full bg-discord-sidebar pl-9 pr-3.5 py-2 rounded-lg text-sm text-white placeholder-discord-text-muted/60 border border-white/10 focus:outline-none focus:border-discord-blurple transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-1.5">
                    Nueva Contraseña *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-discord-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Mínimo 8 caracteres"
                      className="w-full bg-discord-sidebar pl-9 pr-3.5 py-2 rounded-lg text-sm text-white placeholder-discord-text-muted/60 border border-white/10 focus:outline-none focus:border-discord-blurple transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-1.5">
                    Confirmar Nueva Contraseña *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-discord-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      value={newPassword2}
                      onChange={(e) => setNewPassword2(e.target.value)}
                      required
                      placeholder="Repite la nueva contraseña"
                      className="w-full bg-discord-sidebar pl-9 pr-3.5 py-2 rounded-lg text-sm text-white placeholder-discord-text-muted/60 border border-white/10 focus:outline-none focus:border-discord-blurple transition"
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 px-4 py-3 sm:px-6 bg-discord-chat/95 backdrop-blur border-t border-white/10 flex justify-end z-10">
                  <button
                    type="submit"
                    disabled={securityLoading || !oldPassword || !newPassword || !newPassword2}
                    className="min-h-[42px] bg-discord-blurple hover:bg-discord-blurple-hover disabled:opacity-50 text-white text-xs sm:text-sm font-semibold px-6 py-2 rounded-xl transition shadow-lg active:scale-98 cursor-pointer"
                  >
                    {securityLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: ACCOUNT DETAILS */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                {/* User Summary Hero Card */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center sm:items-start gap-3.5 text-center sm:text-left">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-discord-blurple flex items-center justify-center text-2xl font-black text-white shadow-lg overflow-hidden border-2 border-white/10">
                      {avatarPreview ? (
                        <img
                          src={getMediaUrl(avatarPreview)}
                          alt=""
                          onError={() => setAvatarPreview(null)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        user.username?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-discord-green border-2 border-discord-chat flex items-center justify-center" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 justify-center sm:justify-start">
                      <h4 className="text-base font-bold text-white truncate">
                        {user.username}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-discord-blurple/20 text-discord-blurple self-center sm:self-auto">
                        <Shield className="w-3 h-3" />
                        {user.is_staff || user.is_superuser ? 'Administrador' : 'Usuario'}
                      </span>
                    </div>
                    <p className="text-xs text-discord-text-muted truncate mt-0.5">
                      {user.email}
                    </p>
                    {user.status_text && (
                      <p className="text-xs text-discord-green mt-1 italic truncate">
                        "{user.status_text}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Compact Info Grid: Nombre, Correo, Rol y Estado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Nombre */}
                  <div className="p-3.5 rounded-xl bg-discord-sidebar/70 border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-discord-text-muted block">
                      Nombre de Usuario
                    </span>
                    <div className="text-xs font-bold text-white truncate">
                      @{user.username}
                    </div>
                  </div>

                  {/* Correo */}
                  <div className="p-3.5 rounded-xl bg-discord-sidebar/70 border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-discord-text-muted block">
                      Correo Electrónico
                    </span>
                    <div className="text-xs font-bold text-white break-all">
                      {user.email}
                    </div>
                  </div>

                  {/* Rol */}
                  <div className="p-3.5 rounded-xl bg-discord-sidebar/70 border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-discord-text-muted block">
                      Rol en el Sistema
                    </span>
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        user.is_staff || user.is_superuser
                          ? 'bg-discord-blurple/20 text-discord-blurple border border-discord-blurple/30'
                          : 'bg-white/5 text-discord-text border border-white/10'
                      }`}>
                        <Shield className="w-3.5 h-3.5" />
                        {user.is_staff || user.is_superuser ? 'Administrador' : 'Miembro Estándar'}
                      </span>
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="p-3.5 rounded-xl bg-discord-sidebar/70 border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-discord-text-muted block">
                      Estado de la Cuenta
                    </span>
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-discord-green/20 text-discord-green border border-discord-green/30">
                        <span className="w-2 h-2 rounded-full bg-discord-green animate-pulse" />
                        Cuenta Activa
                      </span>
                    </div>
                  </div>

                  {/* Miembro Desde */}
                  <div className="p-3.5 rounded-xl bg-discord-sidebar/70 border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-discord-text-muted block">
                      Miembro Desde
                    </span>
                    <div className="text-xs font-medium text-white">
                      {memberSince}
                    </div>
                  </div>

                  {/* ID de Usuario */}
                  <div className="p-3.5 rounded-xl bg-discord-sidebar/70 border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-discord-text-muted block">
                      ID de Cuenta
                    </span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[11px] text-discord-text-muted truncate">
                        {user.id}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyId}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 hover:text-white rounded-lg hover:bg-white/10 text-discord-text-muted transition flex-shrink-0"
                        title="Copiar ID de usuario"
                      >
                        {copiedId ? (
                          <CheckCircle2 className="w-4 h-4 text-discord-green" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Navigation Actions with Accessible Min Height */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple-hover text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md active:scale-98"
                  >
                    <User className="w-4 h-4" />
                    <span>Editar Información de Perfil</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('security')}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-white/10 transition active:scale-98"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Cambiar Contraseña</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: DANGER ZONE */}
            {activeTab === 'danger' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-discord-red/10 border border-discord-red/30 space-y-2">
                  <h4 className="text-sm font-bold text-discord-red flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>Eliminar Cuenta Permanentemente</span>
                  </h4>
                  <p className="text-xs text-discord-text leading-relaxed">
                    Al eliminar tu cuenta, se borrarán todos tus datos personales, mensajes y configuraciones de forma irreversible. No podrás volver a recuperar el acceso a esta cuenta.
                  </p>
                </div>

                {deleteError && (
                  <div className="rounded-xl bg-discord-red/20 border border-discord-red/30 p-3 text-xs text-discord-red flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{deleteError}</span>
                  </div>
                )}

                {!deleteConfirmOpen ? (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="bg-discord-red hover:bg-discord-red/90 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shadow"
                  >
                    Deseo eliminar mi cuenta
                  </button>
                ) : (
                  <form onSubmit={handleDeleteAccount} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-discord-red mb-1.5">
                        Ingresa tu contraseña actual para confirmar la eliminación:
                      </label>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        required
                        placeholder="Contraseña actual"
                        className="w-full bg-discord-sidebar px-3.5 py-2 rounded-lg text-sm text-white border border-discord-red/50 focus:outline-none focus:ring-1 focus:ring-discord-red transition"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={deleteLoading || !deletePassword}
                        className="bg-discord-red hover:bg-discord-red/90 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shadow"
                      >
                        {deleteLoading ? 'Eliminando cuenta...' : 'Confirmar Eliminación Definitiva'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirmOpen(false);
                          setDeletePassword('');
                          setDeleteError(null);
                        }}
                        className="text-xs text-discord-text-muted hover:text-white px-3 py-2 rounded transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
