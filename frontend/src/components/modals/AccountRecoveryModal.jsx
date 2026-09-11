import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  KeyRound,
  UserCheck,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function AccountRecoveryModal({ isOpen, onClose, initialTab = 'password' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'password' | 'username'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [step, setStep] = useState(1); // 1: request code, 2: enter code & new pass, 3: success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);
  const [recoveredUsername, setRecoveredUsername] = useState(null);
  const [devCodeHint, setDevCodeHint] = useState(null);

  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset);
  const confirmPasswordReset = useAuthStore((state) => state.confirmPasswordReset);
  const recoverUsername = useAuthStore((state) => state.recoverUsername);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setEmail('');
      setCode('');
      setNewPassword('');
      setNewPassword2('');
      setStep(1);
      setError(null);
      setSuccessNotice(null);
      setRecoveredUsername(null);
      setDevCodeHint(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Step 1: Request 6-digit reset code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessNotice(null);

    const res = await requestPasswordReset(email.trim());
    setLoading(false);

    if (res.success) {
      setSuccessNotice(res.data?.detail || 'Código de recuperación enviado a tu correo.');
      if (res.data?.dev_code) {
        setDevCodeHint(res.data.dev_code);
        setCode(res.data.dev_code);
      }
      setStep(2);
    } else {
      setError(res.error);
    }
  };

  // Step 2: Confirm 6-digit code and set new password
  const handleConfirmReset = async (e) => {
    e.preventDefault();
    if (!code.trim() || !newPassword || !newPassword2) return;
    if (newPassword !== newPassword2) {
      setError('Las nuevas contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    setError(null);

    const res = await confirmPasswordReset(email.trim(), code.trim(), newPassword, newPassword2);
    setLoading(false);

    if (res.success) {
      setStep(3);
    } else {
      setError(res.error);
    }
  };

  // Recover Username
  const handleRecoverUsername = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessNotice(null);
    setRecoveredUsername(null);

    const res = await recoverUsername(email.trim());
    setLoading(false);

    if (res.success) {
      setSuccessNotice(res.data?.detail || 'Si el correo está registrado, enviamos tu usuario.');
      if (res.data?.username) {
        setRecoveredUsername(res.data.username);
      }
    } else {
      setError(res.error);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-discord-chat border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Tabs */}
        <div className="bg-discord-sidebar/80 border-b border-white/10 p-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-discord-blurple" />
              <span>Recuperación de Cuenta</span>
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-discord-text-muted hover:text-white hover:bg-white/10 transition"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex border-b border-white/10">
            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setError(null);
                setSuccessNotice(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
                activeTab === 'password'
                  ? 'border-discord-blurple text-white'
                  : 'border-transparent text-discord-text-muted hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Olvidé Contraseña</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('username');
                setError(null);
                setSuccessNotice(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
                activeTab === 'username'
                  ? 'border-discord-blurple text-white'
                  : 'border-transparent text-discord-text-muted hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Olvidé Usuario</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="mb-4 rounded-xl bg-discord-red/20 border border-discord-red/30 p-3 text-xs text-discord-red flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="mb-4 rounded-xl bg-discord-green/20 border border-discord-green/30 p-3 text-xs text-discord-green flex items-start gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successNotice}</span>
            </div>
          )}

          {/* TAB 1: FORGOT PASSWORD */}
          {activeTab === 'password' && (
            <>
              {step === 1 && (
                <form onSubmit={handleRequestCode} className="space-y-4">
                  <p className="text-xs text-discord-text-muted leading-relaxed">
                    Ingresa el correo electrónico asociado a tu cuenta. Te enviaremos un código de seguridad de 6 dígitos para restablecer tu contraseña.
                  </p>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-1.5">
                      Correo Electrónico *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-discord-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        required
                        className="w-full bg-discord-sidebar pl-9 pr-3.5 py-2.5 rounded-lg text-sm text-white placeholder-discord-text-muted/60 border border-white/10 focus:outline-none focus:border-discord-blurple transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full bg-discord-blurple hover:bg-discord-blurple-hover disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition shadow-md flex items-center justify-center gap-2"
                  >
                    {loading ? 'Enviando código...' : 'Enviar código de recuperación'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleConfirmReset} className="space-y-4">
                  <div className="bg-discord-sidebar/60 p-3 rounded-xl border border-white/5 text-xs text-discord-text-muted flex justify-between items-center">
                    <span>
                      Código enviado a: <strong className="text-white">{email}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-discord-blurple hover:underline font-semibold text-[11px]"
                    >
                      Cambiar
                    </button>
                  </div>

                  {devCodeHint && (
                    <div className="bg-discord-blurple/20 border border-discord-blurple/40 p-2.5 rounded-lg text-xs text-discord-blurple flex items-center justify-between">
                      <span>Código detectado: <strong>{devCodeHint}</strong></span>
                      <span className="text-[10px] bg-discord-blurple/30 px-1.5 py-0.5 rounded text-white">Dev Mode</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-1.5">
                      Código de 6 Dígitos *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      className="w-full bg-discord-sidebar px-3.5 py-2.5 rounded-lg text-lg text-center tracking-[0.4em] font-mono font-bold text-white border border-white/10 focus:outline-none focus:border-discord-blurple transition"
                    />
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
                        placeholder="Mínimo 8 caracteres"
                        required
                        className="w-full bg-discord-sidebar pl-9 pr-3.5 py-2.5 rounded-lg text-sm text-white placeholder-discord-text-muted/60 border border-white/10 focus:outline-none focus:border-discord-blurple transition"
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
                        placeholder="Repite la nueva contraseña"
                        required
                        className="w-full bg-discord-sidebar pl-9 pr-3.5 py-2.5 rounded-lg text-sm text-white placeholder-discord-text-muted/60 border border-white/10 focus:outline-none focus:border-discord-blurple transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !code || !newPassword || !newPassword2}
                    className="w-full bg-discord-green hover:bg-discord-green/90 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition shadow-md"
                  >
                    {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleRequestCode}
                      disabled={loading}
                      className="text-xs text-discord-text-muted hover:text-white underline transition"
                    >
                      ¿No recibiste el código? Reenviar
                    </button>
                  </div>
                </form>
              )}

              {step === 3 && (
                <div className="py-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-discord-green/20 text-discord-green flex items-center justify-center mx-auto shadow-xl">
                    <CheckCircle className="w-9 h-9" />
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    ¡Contraseña Restablecida!
                  </h3>
                  <p className="text-xs text-discord-text-muted leading-relaxed max-w-xs mx-auto">
                    Tu contraseña ha sido actualizada con éxito. Ahora puedes iniciar sesión con tu nueva contraseña.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full bg-discord-blurple hover:bg-discord-blurple-hover text-white text-sm font-semibold py-2.5 rounded-lg transition shadow-md"
                  >
                    Ir a Iniciar Sesión
                  </button>
                </div>
              )}
            </>
          )}

          {/* TAB 2: FORGOT USERNAME */}
          {activeTab === 'username' && (
            <form onSubmit={handleRecoverUsername} className="space-y-4">
              <p className="text-xs text-discord-text-muted leading-relaxed">
                Ingresa el correo electrónico registrado con tu cuenta para recordarte tu nombre de usuario.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-1.5">
                  Correo Electrónico *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-discord-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    required
                    className="w-full bg-discord-sidebar pl-9 pr-3.5 py-2.5 rounded-lg text-sm text-white placeholder-discord-text-muted/60 border border-white/10 focus:outline-none focus:border-discord-blurple transition"
                  />
                </div>
              </div>

              {recoveredUsername && (
                <div className="p-4 rounded-xl bg-discord-blurple/20 border border-discord-blurple/40 text-center space-y-1.5 animate-in fade-in">
                  <span className="text-xs text-discord-text-muted">Tu nombre de usuario registrado es:</span>
                  <div className="text-xl font-bold text-white tracking-wide select-all">
                    @{recoveredUsername}
                  </div>
                  <p className="text-[11px] text-discord-text-muted pt-1">
                    💡 <em>Tip: También puedes iniciar sesión ingresando tu correo electrónico directamente en vez del usuario.</em>
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-discord-blurple hover:bg-discord-blurple-hover disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition shadow-md flex items-center justify-center gap-2"
              >
                {loading ? 'Consultando...' : 'Consultar mi usuario'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-discord-text-muted hover:text-white underline transition"
                >
                  Volver a Iniciar Sesión
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
