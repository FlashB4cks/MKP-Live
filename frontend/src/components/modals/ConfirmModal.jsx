import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Eliminar',
  loading = false,
  danger = true,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-discord-chat p-6 shadow-2xl border border-black/30">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 text-discord-text-muted hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-3">
          {danger && (
            <div className="p-2 rounded-full bg-discord-red/20 text-discord-red">
              <AlertTriangle className="w-6 h-6" />
            </div>
          )}
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>

        <p className="text-sm text-discord-text-muted mb-6 leading-relaxed">
          {message}
        </p>

        <div className="flex justify-end items-center space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-sm text-white hover:underline px-4 py-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50 shadow-md ${
              danger
                ? 'bg-discord-red hover:bg-discord-red/90'
                : 'bg-discord-blurple hover:bg-discord-blurple-hover'
            }`}
          >
            {loading ? 'Eliminando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
