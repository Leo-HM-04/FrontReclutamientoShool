"use client";

import { useState, useEffect, useRef } from "react";
import { useModal } from '@/context/ModalContext';
import { apiClient } from "@/lib/api";

interface Client {
  id: number;
  company_name: string;
  industry: string;
  contact_name: string;
  contact_email: string;
}

interface SharedLink {
  token: string;
  share_url: string;
  expires_at?: string | null;
  created_at?: string | null;
  used_at?: string | null;
  client: { id: number; company_name: string };
  status: 'pending' | 'used' | 'expired' | 'in_progress' | 'completed' | string;
}

export default function ShareProfileForm() {
  const { showAlert } = useModal();
  const [clients, setClients] = useState<Client[]>([]);
  // Lista de links compartidos (cargados desde clientes con token o añadidos dinámicamente)
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState('24'); // horas por defecto
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState<'all'|'pending'|'used'|'expired'>('all');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState<number>(30);
  const [animatingTokens, setAnimatingTokens] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Cargamos tanto la lista de clientes como los links compartidos (con su estado)
    loadClients();
    loadSharedLinks();
  }, []);

  const loadClients = async () => {
    try {
      const data = await apiClient.getClients();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
      await showAlert('Error al cargar los clientes');
    }
  };

  const loadSharedLinks = async () => {
    try {
      const links = await apiClient.getClientSharedLinks();
      // Response expected: [{ token, share_url, expires_at, created_at, client: {id, company_name}, status }]
      setSharedLinks(links || []);
    } catch (error) {
      console.error('Error loading shared links:', error);
      // No mostrar alerta intrusiva en carga inicial, solo console
    }
  };

  const generateShareLink = async () => {
    if (!selectedClient) {
      await showAlert('Por favor selecciona un cliente');
      return;
    }

    setLoading(true);
    try {
      const response: any = await apiClient.generateClientShareLink(parseInt(selectedClient), {
        duration_hours: parseInt(duration)
      });

      const linkUrl = response.share_url || `${window.location.origin}/reclutamiento/public/profile-create/${response.token}`;

      // Copiar al portapapeles
      await navigator.clipboard.writeText(linkUrl);

      await showAlert(`Link copiado al portapapeles: ${linkUrl}`);

      // Añadir el link recién creado a la lista de links compartidos en pantalla
      const newLink: SharedLink = {
        token: response.token,
        share_url: response.share_url || linkUrl,
        expires_at: response.expires_at || null,
        created_at: response.created_at || new Date().toISOString(),
        client: response.client || { id: parseInt(selectedClient), company_name: clients.find(c => c.id === parseInt(selectedClient))?.company_name || '' },
        status: 'pending'
      };

      setSharedLinks(prev => [newLink, ...prev]);

      // También actualizar el cliente en la lista local para reflejar que ahora tiene token
      setClients(prev => prev.map(c => c.id === newLink.client.id ? { ...c, share_token: newLink.token, share_token_expires_at: newLink.expires_at, share_token_created_at: newLink.created_at } : c));

      setShowCreateForm(false);
    } catch (error) {
      console.error('Error generating share link:', error);
      await showAlert('Error al generar el link compartido');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async (token: string) => {
    const linkUrl = `${window.location.origin}/reclutamiento/public/profile-create/${token}`;
    try {
      await navigator.clipboard.writeText(linkUrl);
      await showAlert('Link copiado al portapapeles');
    } catch (error) {
      await showAlert('Error al copiar el link');
    }
  };

  const revokeLink = async (link: SharedLink) => {
    if (!window.confirm('¿Deseas invalidar este enlace? Esta acción no se puede deshacer.')) return;

    try {
      setLoading(true);
      // Llamada al backend para marcar como usado
      await apiClient.revokeClientSharedLink(link.client.id, link.token);

      // Actualización optimista en UI
      setSharedLinks(prev => prev.map(l => l.token === link.token ? { ...l, status: 'used', used_at: new Date().toISOString() } : l));

      // Mostrar animación de check para el link invalido
      setAnimatingTokens(prev => [...prev, link.token]);
      setToastMessage('Enlace invalidado correctamente');

      // Remover animación después de 2s
      setTimeout(() => setAnimatingTokens(prev => prev.filter(t => t !== link.token)), 2000);

      // Extra: breve comprobación para refrescar desde servidor
      setTimeout(() => loadSharedLinks(), 1200);
    } catch (error) {
      console.error('Error revocando link:', error);
      setToastMessage('No se pudo invalidar el enlace');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours} hora${hours !== 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `${days} día${days !== 1 ? 's' : ''}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'used': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'expired': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch (e) {
      return iso;
    }
  };

  // Filtrar links según el estado seleccionado
  const filteredLinks = sharedLinks.filter(link => filter === 'all' ? true : (link.status === filter));

  // Conteos por estado para mostrar en los botones
  const counts = {
    all: sharedLinks.length,
    pending: sharedLinks.filter(l => l.status === 'pending').length,
    used: sharedLinks.filter(l => l.status === 'used').length,
    expired: sharedLinks.filter(l => l.status === 'expired').length,
  };

  // Auto-refresh: recargar la lista periódicamente cuando esté activado
  useEffect(() => {
    if (!autoRefresh) {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      return;
    }

    // Start interval
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setInterval(() => {
      loadSharedLinks();
    }, refreshIntervalSeconds * 1000);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [autoRefresh, refreshIntervalSeconds]);

  // Hide toast after a timeout
  useEffect(() => {
    let t: number | undefined;
    if (toastMessage) {
      t = window.setTimeout(() => setToastMessage(null), 3000);
    }
    return () => { if (t) clearTimeout(t); };
  }, [toastMessage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-medium text-gray-900">Enviar Formulario de Perfil</h3>
        <p className="text-sm text-gray-600 mt-1">
          Comparte enlaces públicos para que los clientes puedan crear perfiles de reclutamiento
        </p>
      </div>

      {/* Create New Link Button */}
      <div className="flex justify-between items-center">
        <h4 className="text-md font-medium text-gray-900">Links Compartidos</h4>
        <div className="flex items-center space-x-3">
          <div className="inline-flex items-center bg-gray-50 rounded-md overflow-hidden border">
            <button onClick={() => setFilter('all')} className={`px-3 py-2 text-sm ${filter === 'all' ? 'bg-white' : 'bg-transparent'} ${counts.all === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>Todos ({counts.all})</button>
            <button onClick={() => setFilter('pending')} className={`px-3 py-2 text-sm ${filter === 'pending' ? 'bg-white' : 'bg-transparent'} ${counts.pending === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>Pendientes ({counts.pending})</button>
            <button onClick={() => setFilter('used')} className={`px-3 py-2 text-sm ${filter === 'used' ? 'bg-white' : 'bg-transparent'} ${counts.used === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>Completados ({counts.used})</button>
            <button onClick={() => setFilter('expired')} className={`px-3 py-2 text-sm ${filter === 'expired' ? 'bg-white' : 'bg-transparent'} ${counts.expired === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>Expirados ({counts.expired})</button>
          </div>

          <button
            onClick={loadSharedLinks}
            title="Actualizar"
            className="px-3 py-2 bg-white border rounded-md hover:bg-gray-50"
          >
            <i className="fas fa-sync-alt"></i>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(prev => !prev)}
              title="Auto-refresh"
              className={`px-3 py-2 text-sm rounded ${autoRefresh ? 'bg-green-100 text-green-700' : 'bg-transparent'}`}
            >
              <i className={`fas ${autoRefresh ? 'fa-toggle-on' : 'fa-toggle-off'} mr-2`}></i>
              Auto ({refreshIntervalSeconds}s)
            </button>

            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <i className="fas fa-plus mr-2"></i>
              Crear Nuevo Link
            </button>
          </div>
        </div>
      </div>

      {/* Create Link Form */}
      {showCreateForm && (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <h5 className="text-sm font-medium text-gray-900 mb-3">Crear Link Compartido</h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Profile Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seleccionar Cliente
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Seleccionar cliente...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.company_name} - {client.contact_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duración del Link
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="1">1 hora</option>
                <option value="2">2 horas</option>
                <option value="6">6 horas</option>
                <option value="12">12 horas</option>
                <option value="24">1 día</option>
                <option value="48">2 días</option>
                <option value="168">1 semana</option>
                <option value="720">1 mes</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={generateShareLink}
              disabled={loading || !selectedClient}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generando...' : 'Generar Link'}
            </button>
          </div>
        </div>
      )}

      {/* Shared Links List */}
      <div className="space-y-4">
        {sharedLinks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-share-alt text-3xl mb-2"></i>
            <p>No hay links compartidos aún</p>
            <p className="text-sm">Crea tu primer link para compartir formularios</p>
            <p className="text-xs text-gray-400 mt-2">
              Los links generados aparecerán aquí con información de progreso
            </p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p>No hay links que coincidan con este filtro.</p>
            <p className="text-sm">Cambia el filtro para ver otros enlaces</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLinks.map(link => (
              <div key={link.token} className="flex items-center justify-between p-4 border rounded bg-white">
                <div>
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-gray-900">{link.client?.company_name || 'Cliente'}</div>
                    <div className={`text-xs py-1 px-2 rounded ${getStatusColor(link.status || 'pending')}`}>
                      {link.status === 'used' || link.status === 'completed' ? 'Completado' : link.status === 'expired' ? 'Expirado' : 'Pendiente'}
                    </div>
                      {/* Animated check when animating this token */}
                      {animatingTokens.includes(link.token) && (
                        <div className="ml-3 inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full animate-pulse">
                          <i className="fas fa-check"></i>
                        </div>
                      )}
                  </div>

                  <a href={`${window.location.origin}/reclutamiento/public/profile-create/${link.token}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 break-words">{`${window.location.origin}/reclutamiento/public/profile-create/${link.token}`}</a>
                  <div className="text-xs text-gray-500 mt-1">Expira: {formatDate(link.expires_at)}{link.used_at ? ` • Usado: ${formatDate(link.used_at)}` : ''}</div>

                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyLink(link.token)}
                    className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50"
                  >
                    <i className="fas fa-copy mr-2"></i>
                    Copiar
                  </button>

                  <a
                    href={`${window.location.origin}/reclutamiento/public/profile-create/${link.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Abrir
                  </a>

                  <button
                    onClick={() => revokeLink(link)}
                    disabled={link.status === 'used' || link.status === 'expired' || loading}
                    className={`px-3 py-1 text-sm rounded ${link.status === 'used' ? 'bg-gray-300 text-gray-700 cursor-not-allowed' : link.status === 'expired' ? 'bg-gray-200 text-gray-600 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'} ${ (link.status === 'expired' || loading) ? 'opacity-50 cursor-not-allowed' : '' }`}
                  >
                    {link.status === 'used' ? 'Invalidado' : link.status === 'expired' ? 'Expirado' : 'Invalidar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {toastMessage && (
        <div className="fixed right-6 bottom-6 z-50">
          <div className="bg-green-600 text-white px-4 py-2 rounded shadow-lg animate-fade-in">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}