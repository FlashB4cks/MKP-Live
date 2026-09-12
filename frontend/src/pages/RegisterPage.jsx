import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage({ onSwitchToLogin }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [localError, setLocalError] = useState(null);

  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (password !== password2) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 8) {
      setLocalError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    await register(username.trim(), email.trim(), password, password2);
  };

  const displayError = localError || error;

  return (
    <div
      className="h-[100dvh] min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-4 relative bg-[#1a1d36] bg-cover bg-center bg-no-repeat overflow-y-auto select-none"
      style={{ backgroundImage: "url('/login-bg.svg')" }}
    >
      {/* Subtle dark backdrop overlay */}
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

        {/* Floating Register Card */}
        <div className="w-full bg-[#313338] rounded-2xl p-5 sm:p-8 shadow-2xl border border-black/20 backdrop-blur-sm select-text">
          <div className="text-center mb-6 select-none">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Crear una cuenta en MKP Live
            </h1>
            <p className="text-xs sm:text-sm text-[#b5bac1] mt-1">
              Únete a nuestra comunidad en tiempo real
            </p>
          </div>

          {displayError && (
          <div className="mb-4 rounded bg-discord-red/20 p-3 text-sm text-discord-red border border-discord-red/30">
            {displayError}
          </div>
        )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
                CORREO ELECTRÓNICO <span className="text-[#f23f43]">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md bg-[#1e1f22] px-3.5 py-2.5 text-sm text-white placeholder:text-[#80848e] border border-black/30 focus:border-discord-blurple focus:outline-none transition shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
                NOMBRE DE USUARIO <span className="text-[#f23f43]">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
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
                required
                className="w-full rounded-md bg-[#1e1f22] px-3.5 py-2.5 text-sm text-white placeholder:text-[#80848e] border border-black/30 focus:border-discord-blurple focus:outline-none transition shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
                REPETIR CONTRASEÑA <span className="text-[#f23f43]">*</span>
              </label>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
                className="w-full rounded-md bg-[#1e1f22] px-3.5 py-2.5 text-sm text-white placeholder:text-[#80848e] border border-black/30 focus:border-discord-blurple focus:outline-none transition shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-discord-blurple hover:bg-discord-blurple-hover active:bg-[#4752c4] py-2.5 sm:py-3 text-sm font-semibold text-white transition duration-150 disabled:opacity-50 shadow-md mt-2"
            >
              {loading ? 'Creando cuenta...' : 'Continuar'}
            </button>

            <div className="text-xs sm:text-sm text-[#949ba4] text-left sm:text-center pt-2 select-none">
              ¿Ya tienes una cuenta?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-[#00a8fc] hover:underline font-medium transition"
              >
                Iniciar sesión
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
