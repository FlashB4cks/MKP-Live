import React, { useState } from 'react';
import {
  UserCheck,
  UserPlus,
  Users,
  Clock,
  Check,
  X,
  MessageSquare,
  Search,
  Trash2,
  Menu,
  Loader2,
  Send,
} from 'lucide-react';
import { useDMStore } from '../../store/dmStore';
import { useAuthStore } from '../../store/authStore';
import StartDMModal from '../modals/StartDMModal';
import ConfirmModal from '../modals/ConfirmModal';
import api from '../../api/client';

export default function ContactRequestsView({ onOpenMobileNav }) {
  const conversations = useDMStore((state) => state.conversations);
  const selectConversation = useDMStore((state) => state.selectConversation);
  const acceptDMRequest = useDMStore((state) => state.acceptDMRequest);
  const rejectDMRequest = useDMStore((state) => state.rejectDMRequest);
  const deleteConversation = useDMStore((state) => state.deleteConversation);
  const startDirectMessage = useDMStore((state) => state.startDirectMessage);
  const currentUser = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState('incoming'); // 'incoming' | 'outgoing' | 'all' | 'add'
  const [filterQuery, setFilterQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Add friend tab state
  const [addUsernameInput, setAddUsernameInput] = useState('');
  const [addStatus, setAddStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const [addLoading, setAddLoading] = useState(false);

  // Split conversations into categories
  const incomingRequests = conversations.filter((c) => {
    if (c.status !== 'PENDING') return false;
    return (
      c.awaiting_my_acceptance ||
      (c.initiated_by && String(c.initiated_by) !== String(currentUser?.id))
    );
  });

  const outgoingRequests = conversations.filter((c) => {
    if (c.status !== 'PENDING') return false;
    return (
      !c.awaiting_my_acceptance &&
      String(c.initiated_by) === String(currentUser?.id)
    );
  });

  const allContacts = conversations.filter((c) => c.status === 'ACCEPTED');

  const getPartner = (conv) => {
    return (
      conv.other_user ||
      conv.participants?.find((p) => String(p.id) !== String(currentUser?.id)) || {
        username: 'Usuario',
        is_online: false,
      }
    );
  };

  const handleAccept = async (convId) => {
    setActionLoadingId(convId);
    try {
      await acceptDMRequest(convId);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (convId) => {
    setActionLoadingId(convId);
    try {
      await rejectDMRequest(convId);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelOutgoing = async (convId) => {
    setActionLoadingId(convId);
    try {
      await deleteConversation(convId);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendRequest = async (e) => {
    e?.preventDefault();
    const cleanUsername = addUsernameInput.trim().replace(/^@/, '');
    if (!cleanUsername) return;

    setAddLoading(true);
    setAddStatus(null);
    try {
      const res = await startDirectMessage(null, cleanUsername);
      if (res.success) {
        setAddStatus({
          type: 'success',
          message: `¡Solicitud de contacto enviada a @${cleanUsername}!`,
        });
        setAddUsernameInput('');
      } else {
        setAddStatus({
          type: 'error',
          message: res.error || 'No se pudo enviar la solicitud.',
        });
      }
    } catch (err) {
      setAddStatus({
        type: 'error',
        message: err.response?.data?.detail || 'Error al enviar la solicitud.',
      });
    } finally {
      setAddLoading(false);
    }
  };

  // Filter current list by search query
  const filterList = (list) => {
    if (!filterQuery.trim()) return list;
    const q = filterQuery.toLowerCase().replace(/^@/, '');
    return list.filter((conv) => {
      const partner = getPartner(conv);
      return partner.username?.toLowerCase().includes(q);
    });
  };

  return (
    <main className="flex-1 bg-discord-chat flex flex-col min-w-0 h-full overflow-hidden select-none">
      {/* Top Header */}
      <header className="h-12 border-b border-black/20 px-3 sm:px-4 flex items-center justify-between flex-shrink-0 shadow-sm bg-discord-chat">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          {onOpenMobileNav && (
            <button
              onClick={onOpenMobileNav}
              className="md:hidden p-1.5 -ml-1 text-discord-text-muted hover:text-white hover:bg-discord-hover rounded-lg transition mr-1"
              title="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Users className="w-5 h-5 text-discord-text-muted" />
            <span>Solicitudes</span>
          </div>

          {/* Vertical Separator */}
          <div className="h-4 w-[1px] bg-white/20 hidden sm:block" />

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
            {/* Incoming requests tab */}
            <button
              onClick={() => {
                setActiveTab('incoming');
                setFilterQuery('');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'incoming'
                  ? 'bg-discord-active text-white'
                  : 'text-discord-text-muted hover:text-white hover:bg-discord-hover'
              }`}
            >
              <span>Recibidas</span>
              {incomingRequests.length > 0 && (
                <span className="bg-discord-red text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {incomingRequests.length}
                </span>
              )}
            </button>

            {/* Outgoing requests tab */}
            <button
              onClick={() => {
                setActiveTab('outgoing');
                setFilterQuery('');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'outgoing'
                  ? 'bg-discord-active text-white'
                  : 'text-discord-text-muted hover:text-white hover:bg-discord-hover'
              }`}
            >
              <span>Enviadas</span>
              {outgoingRequests.length > 0 && (
                <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {outgoingRequests.length}
                </span>
              )}
            </button>

            {/* All contacts tab */}
            <button
              onClick={() => {
                setActiveTab('all');
                setFilterQuery('');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-discord-active text-white'
                  : 'text-discord-text-muted hover:text-white hover:bg-discord-hover'
              }`}
            >
              <span>Todos ({allContacts.length})</span>
            </button>

            {/* Add friend tab button */}
            <button
              onClick={() => {
                setActiveTab('add');
                setFilterQuery('');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition whitespace-nowrap ${
                activeTab === 'add'
                  ? 'bg-discord-green text-white shadow'
                  : 'text-discord-green hover:bg-discord-green/20'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Añadir contacto</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Search bar (visible in incoming, outgoing, all tabs) */}
        {activeTab !== 'add' && (
          <div className="mb-5 max-w-xl">
            <div className="relative flex items-center bg-discord-sidebar/80 rounded-lg px-3 py-2 border border-white/10 focus-within:border-discord-blurple transition">
              <Search className="w-4 h-4 text-discord-text-muted mr-2 flex-shrink-0" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Buscar por @usuario..."
                className="bg-transparent text-xs text-white placeholder:text-discord-text-muted focus:outline-none w-full"
              />
              {filterQuery && (
                <button
                  onClick={() => setFilterQuery('')}
                  className="text-discord-text-muted hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: Recibidas (Incoming) */}
        {activeTab === 'incoming' && (
          <div className="max-w-3xl">
            <div className="text-xs font-bold text-discord-text-muted uppercase tracking-wider mb-3">
              Solicitudes Recibidas — {incomingRequests.length}
            </div>

            {filterList(incomingRequests).length === 0 ? (
              <div className="py-12 text-center text-discord-text-muted">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-discord-sidebar flex items-center justify-center text-discord-text-muted">
                  <UserCheck className="w-8 h-8" />
                </div>
                <p className="text-sm font-semibold text-white">No tienes solicitudes pendientes</p>
                <p className="text-xs mt-1">
                  Cuando otros usuarios te envíen una solicitud de contacto, podrás aceptarla aquí.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 border border-white/10 rounded-xl bg-discord-sidebar/40 overflow-hidden">
                {filterList(incomingRequests).map((conv) => {
                  const partner = getPartner(conv);
                  const isLoading = actionLoadingId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      className="p-3 sm:p-4 flex items-center justify-between hover:bg-white/[0.03] transition gap-3"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-discord-blurple flex items-center justify-center font-bold text-white text-sm overflow-hidden">
                            {partner.avatar_url ? (
                              <img
                                src={partner.avatar_url}
                                alt={partner.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              partner.username?.[0]?.toUpperCase() || 'U'
                            )}
                          </div>
                          {partner.is_online && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-discord-green rounded-full border-2 border-discord-chat" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <span className="text-sm font-bold text-white block truncate">
                            @{partner.username}
                          </span>
                          <span className="text-xs text-discord-text-muted block truncate">
                            Solicitud de contacto entrante
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => handleAccept(conv.id)}
                          disabled={isLoading}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-discord-green hover:bg-discord-green/90 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
                          title="Aceptar solicitud"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden xs:inline">Aceptar</span>
                        </button>

                        <button
                          onClick={() => handleReject(conv.id)}
                          disabled={isLoading}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-discord-sidebar hover:bg-discord-red/80 text-discord-text-muted hover:text-white rounded-lg text-xs font-semibold border border-white/10 transition disabled:opacity-50"
                          title="Rechazar solicitud"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span className="hidden xs:inline">Rechazar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Enviadas (Outgoing) */}
        {activeTab === 'outgoing' && (
          <div className="max-w-3xl">
            <div className="text-xs font-bold text-discord-text-muted uppercase tracking-wider mb-3">
              Solicitudes Enviadas (Pendientes) — {outgoingRequests.length}
            </div>

            {filterList(outgoingRequests).length === 0 ? (
              <div className="py-12 text-center text-discord-text-muted">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-discord-sidebar flex items-center justify-center text-discord-text-muted">
                  <Clock className="w-8 h-8" />
                </div>
                <p className="text-sm font-semibold text-white">No tienes solicitudes enviadas pendientes</p>
                <p className="text-xs mt-1">
                  Usa la pestaña "Añadir contacto" para buscar usuarios y enviarles una invitación.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 border border-white/10 rounded-xl bg-discord-sidebar/40 overflow-hidden">
                {filterList(outgoingRequests).map((conv) => {
                  const partner = getPartner(conv);
                  const isLoading = actionLoadingId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      className="p-3 sm:p-4 flex items-center justify-between hover:bg-white/[0.03] transition gap-3"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-discord-blurple flex items-center justify-center font-bold text-white text-sm overflow-hidden">
                            {partner.avatar_url ? (
                              <img
                                src={partner.avatar_url}
                                alt={partner.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              partner.username?.[0]?.toUpperCase() || 'U'
                            )}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <span className="text-sm font-bold text-white block truncate">
                            @{partner.username}
                          </span>
                          <span className="text-xs text-discord-text-muted flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-discord-yellow" />
                            <span>Solicitud enviada (esperando respuesta)</span>
                          </span>
                        </div>
                      </div>

                      {/* Cancel outgoing button */}
                      <button
                        onClick={() => handleCancelOutgoing(conv.id)}
                        disabled={isLoading}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-discord-sidebar hover:bg-discord-red/80 text-discord-text-muted hover:text-white rounded-lg text-xs font-semibold border border-white/10 transition disabled:opacity-50"
                        title="Cancelar solicitud enviada"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                        <span>Cancelar</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Todos los contactos (All) */}
        {activeTab === 'all' && (
          <div className="max-w-3xl">
            <div className="text-xs font-bold text-discord-text-muted uppercase tracking-wider mb-3">
              Todos los Contactos — {allContacts.length}
            </div>

            {filterList(allContacts).length === 0 ? (
              <div className="py-12 text-center text-discord-text-muted">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-discord-sidebar flex items-center justify-center text-discord-text-muted">
                  <Users className="w-8 h-8" />
                </div>
                <p className="text-sm font-semibold text-white">No hay contactos en esta lista</p>
                <p className="text-xs mt-1">
                  Empieza agregando nuevos amigos desde la pestaña "Añadir contacto".
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 border border-white/10 rounded-xl bg-discord-sidebar/40 overflow-hidden">
                {filterList(allContacts).map((conv) => {
                  const partner = getPartner(conv);

                  return (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className="p-3 sm:p-4 flex items-center justify-between hover:bg-white/[0.04] transition cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-discord-blurple flex items-center justify-center font-bold text-white text-sm overflow-hidden">
                            {partner.avatar_url ? (
                              <img
                                src={partner.avatar_url}
                                alt={partner.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              partner.username?.[0]?.toUpperCase() || 'U'
                            )}
                          </div>
                          {partner.is_online && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-discord-green rounded-full border-2 border-discord-chat" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-white group-hover:text-discord-blurple transition truncate">
                              @{partner.username}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                partner.is_online
                                  ? 'bg-discord-green/20 text-discord-green'
                                  : 'bg-white/5 text-discord-text-muted'
                              }`}
                            >
                              {partner.is_online ? 'En línea' : 'Desconectado'}
                            </span>
                          </div>
                          <span className="text-xs text-discord-text-muted block truncate mt-0.5">
                            {conv.last_message?.content || partner.status_text || 'Haz clic para abrir chat'}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectConversation(conv);
                          }}
                          className="p-2 bg-discord-sidebar hover:bg-discord-blurple text-discord-text-muted hover:text-white rounded-full transition"
                          title="Enviar mensaje directo"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConversationToDelete(conv);
                          }}
                          className="p-2 bg-discord-sidebar hover:bg-discord-red text-discord-text-muted hover:text-white rounded-full transition"
                          title="Eliminar conversación"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Añadir Contacto */}
        {activeTab === 'add' && (
          <div className="max-w-2xl">
            <h3 className="text-base font-bold text-white mb-1">AÑADIR CONTACTO</h3>
            <p className="text-xs text-discord-text-muted mb-4">
              Puedes añadir a un amigo ingresando su nombre de usuario de MKP Live. Se le enviará una solicitud de contacto que deberá aceptar para empezar a chatear.
            </p>

            <form onSubmit={handleSendRequest} className="mb-4">
              <div className="flex items-center bg-discord-input rounded-xl p-2 border border-white/10 focus-within:border-discord-blurple transition shadow-inner">
                <span className="text-discord-text-muted font-bold px-2 text-sm">@</span>
                <input
                  type="text"
                  value={addUsernameInput}
                  onChange={(e) => {
                    setAddUsernameInput(e.target.value);
                    if (addStatus) setAddStatus(null);
                  }}
                  placeholder="Introduce el nombre de usuario (ej. juan)..."
                  className="bg-transparent text-xs sm:text-sm text-white placeholder:text-discord-text-muted focus:outline-none flex-1 min-w-0"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!addUsernameInput.trim() || addLoading}
                  className="px-4 py-2 bg-discord-blurple hover:bg-discord-blurple-hover disabled:bg-discord-blurple/50 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow"
                >
                  {addLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Enviar solicitud</span>
                </button>
              </div>
            </form>

            {addStatus && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold mb-4 animate-in fade-in flex items-center space-x-2 ${
                  addStatus.type === 'success'
                    ? 'bg-discord-green/20 text-discord-green border border-discord-green/30'
                    : 'bg-discord-red/20 text-discord-red border border-discord-red/30'
                }`}
              >
                {addStatus.type === 'success' ? (
                  <Check className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{addStatus.message}</span>
              </div>
            )}

            {/* Quick helper card */}
            <div className="mt-8 p-4 rounded-xl bg-discord-sidebar/60 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                ¿Buscas usuarios interactivos?
              </h4>
              <p className="text-xs text-discord-text-muted leading-relaxed">
                También puedes buscar usuarios con autocompletado en tiempo real pulsando en el botón siguiente:
              </p>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition flex items-center gap-2"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Explorar y buscar usuarios</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <StartDMModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <ConfirmModal
        isOpen={Boolean(conversationToDelete)}
        onClose={() => setConversationToDelete(null)}
        onConfirm={async () => {
          if (conversationToDelete) {
            await deleteConversation(conversationToDelete.id);
            setConversationToDelete(null);
          }
        }}
        title="Eliminar contacto"
        message={`¿Estás seguro de que deseas eliminar la conversación con @${
          getPartner(conversationToDelete || {}).username
        }? Esta acción es permanente.`}
        confirmText="Eliminar"
        isDestructive
      />
    </main>
  );
}
