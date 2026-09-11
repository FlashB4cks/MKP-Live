import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#1e1f22] p-4">
      <div className="w-full max-w-[480px] bg-discord-chat rounded-lg p-8 shadow-2xl border border-black/20">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-discord-blurple flex items-center justify-center text-white mb-4 shadow-lg">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white text-center">
            ¡Te damos la bienvenida a MKP Live!
          </h1>
          <p className="text-sm text-discord-text-muted mt-1 text-center">
            Conéctate y chatea en tiempo real con tus comunidades
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded bg-discord-red/20 p-3 text-sm text-discord-red border border-discord-red/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted mb-2">
              Usuario o Correo electrónico *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu usuario o correo"
              required
              className="w-full rounded bg-discord-sidebar p-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-discord-blurple"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-discord-text-muted">
                Contraseña *
              </label>
              <button
                type="button"
                onClick={() => {
                  setRecoveryInitialTab('password');
                  setRecoveryModalOpen(true);
                }}
                className="text-xs text-discord-blurple hover:underline font-medium"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded bg-discord-sidebar p-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-discord-blurple"
            />

            <div className="flex justify-end pt-1.5">
              <button
                type="button"
                onClick={() => {
                  setRecoveryInitialTab('username');
                  setRecoveryModalOpen(true);
                }}
                className="text-[11px] text-discord-text-muted hover:text-white transition underline"
              >
                ¿Olvidaste tu nombre de usuario?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-discord-blurple py-2.5 text-sm font-semibold text-white hover:bg-discord-blurple-hover transition duration-200 disabled:opacity-50 shadow-md"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>

          <div className="text-sm text-discord-text-muted text-center pt-2">
            ¿Necesitas una cuenta?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-discord-blurple hover:underline font-medium"
            >
              Registrarse
            </button>
          </div>
        </form>
      </div>

      <AccountRecoveryModal
        isOpen={recoveryModalOpen}
        onClose={() => setRecoveryModalOpen(false)}
        initialTab={recoveryInitialTab}
      />
    </div>
  );
}
