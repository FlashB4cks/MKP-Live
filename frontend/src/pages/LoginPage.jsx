import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import AccountRecoveryModal from '../components/modals/AccountRecoveryModal';

export default function LoginPage({ onSwitchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [recoveryInitialTab, setRecoveryInitialTab] = useState('password');

  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div
      className="h-[100dvh] min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-4 relative bg-[#1a1d36] bg-cover bg-center bg-no-repeat overflow-y-auto select-none"
      style={{ backgroundImage: "url('/login-bg.svg')" }}
    >
      {/* Subtle dark backdrop overlay for depth and contrast */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      <div className="relative z-10 w-full max-w-[460px] flex flex-col items-center my-auto py-2 sm:py-4">
        {/* Brand Logo at Top */}
        <div className="mb-4 sm:mb-5 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="MKP Live"
            className="h-9 sm:h-11 w-auto object-contain drop-shadow-md"
          />
        </div>

        {/* Floating Login Card */}
        <div className="w-full bg-[#313338] rounded-2xl p-5 sm:p-8 shadow-2xl border border-black/20 backdrop-blur-sm select-text">
          <div className="text-center mb-6 select-none">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              ¡Te damos la bienvenida de nuevo!
            </h1>
            <p className="text-xs sm:text-sm text-[#b5bac1] mt-1">
              ¡Nos alegra verte de nuevo!
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-discord-red/20 p-3 text-xs text-discord-red border border-discord-red/30">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
                CORREO ELECTRÓNICO O NOMBRE DE USUARIO <span className="text-[#f23f43]">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tu correo o usuario"
                required
                autoFocus
                className="w-full rounded-md bg-[#1e1f22] px-3.5 py-2.5 text-sm text-white placeholder:text-[#80848e] border border-black/30 focus:border-discord-blurple focus:outline-none transition shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
                CONTRASEÑA <span className="text-[#f23f43]">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-md bg-[#1e1f22] px-3.5 py-2.5 text-sm text-white placeholder:text-[#80848e] border border-black/30 focus:border-discord-blurple focus:outline-none transition shadow-inner"
              />

              {/* Recovery links side by side */}
              <div className="flex items-center space-x-1.5 pt-2 text-xs select-none">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryInitialTab('password');
                    setRecoveryModalOpen(true);
                  }}
                  className="text-[#00a8fc] hover:underline font-medium transition"
                >
                  ¿Olvidaste tu contraseña?
                </button>
                <span className="text-[#949ba4]">•</span>
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryInitialTab('username');
                    setRecoveryModalOpen(true);
                  }}
                  className="text-[#00a8fc] hover:underline font-medium transition"
                >
                  ¿Olvidaste tu usuario?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-discord-blurple hover:bg-discord-blurple-hover active:bg-[#4752c4] py-2.5 sm:py-3 text-sm font-semibold text-white transition duration-150 disabled:opacity-50 shadow-md mt-2"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>

            <div className="text-xs sm:text-sm text-[#949ba4] text-left sm:text-center pt-2 select-none">
              ¿Necesitas una cuenta?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-[#00a8fc] hover:underline font-medium transition"
              >
                Registrarse
              </button>
            </div>
          </form>
        </div>
      </div>

      <AccountRecoveryModal
        isOpen={recoveryModalOpen}
        onClose={() => setRecoveryModalOpen(false)}
        initialTab={recoveryInitialTab}
      />
    </div>
  );
}
