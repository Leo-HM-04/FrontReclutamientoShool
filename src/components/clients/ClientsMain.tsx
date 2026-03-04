"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import ClientDetail from "./ClientDetail";
import ClientForm from "./ClientForm";
import AddContactModal from "./AddContactModal";
import { useModal } from "@/context/ModalContext";
import Pagination from "../ui/Pagination";


type ClientView = 
  | "clients-list" 
  | "client-create"
  | "client-detail"
  | "contacts" 
  | "contracts"
  | "history"
  | "statistics";

interface MenuItem {
  id: ClientView;
  label: string;
  icon: string;
  description: string;
}

interface ClientsMainProps {
  onClose?: () => void;
}

export default function ClientsMain({ onClose }: ClientsMainProps) {
  const [currentView, setCurrentView] = useState<ClientView>("clients-list");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");
  
  // Data states
  const [clients, setClients] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Contract upload states
  const [showContractForm, setShowContractForm] = useState(false);
  const [contractUploading, setContractUploading] = useState(false);
  const [contractForm, setContractForm] = useState({
    client: "",
    title: "",
    description: "",
    file: null as File | null,
    start_date: "",
    end_date: "",
  });
  
  // PDF Preview state
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState("");

  // Filtros para clients-list
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const { showConfirm, showAlert, showSuccess, showError } = useModal();
  
  // Pagination states
  const [clientsPage, setClientsPage] = useState(1);
  const [clientsPerPage, setClientsPerPage] = useState(10);
  const [contactsPage, setContactsPage] = useState(1);
  const [contactsPerPage, setContactsPerPage] = useState(10);

  // Load data when view changes
  useEffect(() => {
    loadData();
  }, [currentView]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (currentView) {
        case "clients-list":
          const clientsData = await apiClient.getClients();
          setClients(clientsData as any[]);
          break;
        case "contacts":
          const clientsForContacts = await apiClient.getClients();
          setClients(clientsForContacts as any[]);
          break;
        case "contracts":
          const [contractsData, clientsForContracts] = await Promise.all([
            apiClient.getClientContracts(),
            apiClient.getClients(),
          ]);
          setContracts(contractsData as any[]);
          setClients(clientsForContracts as any[]);
          break;
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleContractUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractForm.file || !contractForm.client || !contractForm.title) {
      await showAlert("Por favor completa los campos obligatorios (Cliente, Título y Archivo)");
      return;
    }
    setContractUploading(true);
    try {
      const formData = new FormData();
      formData.append("client", contractForm.client);
      formData.append("title", contractForm.title);
      if (contractForm.description) formData.append("description", contractForm.description);
      formData.append("file", contractForm.file);
      if (contractForm.start_date) formData.append("start_date", contractForm.start_date);
      if (contractForm.end_date) formData.append("end_date", contractForm.end_date);

      await apiClient.uploadClientContract(formData);
      await showSuccess("Contrato subido exitosamente");
      setContractForm({ client: "", title: "", description: "", file: null, start_date: "", end_date: "" });
      setShowContractForm(false);
      loadData();
    } catch (error: any) {
      console.error("Error uploading contract:", error);
      await showError(error.message || "Error al subir el contrato");
    } finally {
      setContractUploading(false);
    }
  };

  const handleDeleteContract = async (contractId: number, contractTitle: string) => {
    const confirmed = await showConfirm(`¿Estás seguro de eliminar el contrato "${contractTitle}"?`);
    if (confirmed) {
      try {
        await apiClient.deleteClientContract(contractId);
        await showSuccess("Contrato eliminado");
        loadData();
      } catch (error) {
        console.error("Error deleting contract:", error);
        await showError("Error al eliminar el contrato");
      }
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: "clients-list",
      label: "Ver Clientes",
      icon: "fa-building",
      description: "Ver y gestionar todos los clientes"
    },
    {
      id: "contacts",
      label: "Contactos",
      icon: "fa-address-book",
      description: "Gestionar contactos de clientes"
    },
    {
      id: "contracts",
      label: "Contratos",
      icon: "fa-file-contract",
      description: "Contratos y acuerdos"
    },
    {
      id: "history",
      label: "Historial",
      icon: "fa-history",
      description: "Historial de interacciones"
    },
    {
      id: "statistics",
      label: "Estadísticas",
      icon: "fa-chart-bar",
      description: "Métricas y estadísticas de clientes"
    }
  ];

  const getNavClass = (view: ClientView) => {
    return currentView === view
      ? "bg-green-50 text-green-700 border-l-4 border-green-600"
      : "text-gray-700 hover:bg-gray-50 border-l-4 border-transparent";
  };

  const handleViewClient = (clientId: number) => {
    setSelectedClientId(clientId);
    setCurrentView("client-detail");
  };

  const handleEditClient = (clientId: number) => {
    setSelectedClientId(clientId);
    setCurrentView("client-create");
  };

  const handleDeleteClient = async (clientId: number) => {
    const confirmed = await showConfirm('¿Estás seguro de que deseas eliminar este cliente?');
    if (confirmed) {
      try {
        await apiClient.deleteClient(clientId);
        await showSuccess('Cliente eliminado exitosamente');
        loadData();
      } catch (error) {
        console.error('Error deleting client:', error);
        await showError('Error al eliminar el cliente');
      }
    }
  };

  const handleBackToList = () => {
    setSelectedClientId(null);
    setCurrentView("clients-list");
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h2>
            <p className="text-gray-600 mt-1">
              Sistema completo para gestionar clientes y contactos
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-4 sm:mt-0 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Volver
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Menu */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Menú de Clientes
            </h3>
            <nav className="space-y-1">
              {menuItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <button
                    onClick={() => {
                      setCurrentView(item.id);
                      setSelectedClientId(null);
                    }}
                    className={`w-full flex items-start px-3 py-3 text-sm font-medium rounded-lg transition-all ${getNavClass(
                      item.id
                    )}`}
                  >
                    <div className="shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                        <i className={`fas ${item.icon} text-lg`}></i>
                      </div>
                    </div>
                    <div className="ml-3 flex-1 text-left">
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                    </div>
                  </button>
                  {index === 0 && (
                    <button
                      onClick={() => {
                        setSelectedClientId(null);
                        setCurrentView("client-create");
                      }}
                      className={`w-full flex items-start px-3 py-3 text-sm font-medium rounded-lg transition-all ${getNavClass(
                        "client-create"
                      )}`}
                    >
                      <div className="shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-green-600 flex items-center justify-center text-white">
                          <i className="fas fa-plus text-lg"></i>
                        </div>
                      </div>
                      <div className="ml-3 flex-1 text-left">
                        <div className="font-semibold">Crear Nuevo Cliente</div>
                        <div className="text-xs text-gray-500 mt-0.5">Agregar un nuevo cliente</div>
                      </div>
                    </button>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* CLIENT DETAIL */}
            {currentView === "client-detail" && selectedClientId && (
              <ClientDetail 
                clientId={selectedClientId}
                onBack={handleBackToList}
                onEdit={handleEditClient}
                onDelete={handleDeleteClient}
              />
            )}

            {/* CLIENT CREATE/EDIT FORM */}
            {currentView === "client-create" && (
              <ClientForm 
                clientId={selectedClientId || undefined}
                onSuccess={handleBackToList}
              />
            )}

            {/* CLIENTS LIST */}
            {currentView === "clients-list" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Todos los Clientes</h3>
                  <button 
                    onClick={loadData}
                    className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium flex items-center gap-2"
                  >
                    <i className="fas fa-sync"></i>
                    Actualizar
                  </button>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <i className="fas fa-search mr-2"></i>
                      Buscar
                    </label>
                    <input
                      type="text"
                      placeholder="Buscar por nombre o industria..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <i className="fas fa-filter mr-2"></i>
                      Estado
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="all">Todos los estados</option>
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <i className="fas fa-industry mr-2"></i>
                      Industria
                    </label>
                    <select
                      value={industryFilter}
                      onChange={(e) => setIndustryFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="all">Todas las industrias</option>
                      {Array.from(new Set(clients.map(c => c.industry).filter(Boolean))).map(industry => (
                        <option key={industry} value={industry}>
                          {industry}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h4 className="text-orange-900 font-semibold text-sm mb-1">Total Clientes</h4>
                    <p className="text-3xl font-bold text-orange-900">
                      {clients.length}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="text-green-900 font-semibold text-sm mb-1">Activos</h4>
                    <p className="text-3xl font-bold text-green-900">
                      {clients.filter(c => c.is_active).length}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-blue-900 font-semibold text-sm mb-1">Con Contratos</h4>
                    <p className="text-3xl font-bold text-blue-900">
                      {clients.filter(c => c.contract_status === 'active').length}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="text-purple-900 font-semibold text-sm mb-1">Inactivos</h4>
                    <p className="text-3xl font-bold text-purple-900">
                      {clients.filter(c => !c.is_active).length}
                    </p>
                  </div>
                </div>
                
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando clientes...</p>
                  </div>
                ) : clients.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <i className="fas fa-building text-5xl mb-4 text-gray-300"></i>
                    <p className="text-lg">No hay clientes registrados</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              EMPRESA
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              CONTACTO
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              INDUSTRIA
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              UBICACIÓN
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ESTADO
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              TELÉFONO
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ACCIONES
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(() => {
                            const filteredClients = clients.filter(client => {
                              const matchesSearch = searchTerm === "" || 
                                client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                client.industry?.toLowerCase().includes(searchTerm.toLowerCase());
                              const matchesStatus = statusFilter === "all" || 
                                (statusFilter === "active" && client.is_active) ||
                                (statusFilter === "inactive" && !client.is_active);
                              const matchesIndustry = industryFilter === "all" || client.industry === industryFilter;
                              return matchesSearch && matchesStatus && matchesIndustry;
                            });
                            const startIndex = (clientsPage - 1) * clientsPerPage;
                            const paginatedClients = filteredClients.slice(startIndex, startIndex + clientsPerPage);
                            return paginatedClients.map((client) => (
                            <tr key={client.id} className="hover:bg-gray-50 cursor-pointer">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold">
                                      {(client.company_name?.[0] || 'C').toUpperCase()}
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {client.company_name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {client.rfc || '-'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{client.contact_name || '-'}</div>
                                <div className="text-sm text-gray-500">{client.contact_email || '-'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{client.industry || '-'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{client.address_city || '-'}</div>
                                <div className="text-sm text-gray-500">{client.address_state || '-'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  client.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {client.is_active ? 'Activo' : 'Inactivo'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {client.contact_phone || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex items-center space-x-3">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleViewClient(client.id); }}
                                    className="text-blue-600 hover:text-blue-900 transition-colors"
                                    title="Ver detalles"
                                  >
                                    <i className="fas fa-eye text-lg"></i>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditClient(client.id); }}
                                    className="text-orange-600 hover:text-orange-900 transition-colors"
                                    title="Editar"
                                  >
                                    <i className="fas fa-edit text-lg"></i>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                                    className="text-red-600 hover:text-red-900 transition-colors"
                                    title="Eliminar"
                                  >
                                    <i className="fas fa-trash text-lg"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination for clients */}
                    {(() => {
                      const filteredClients = clients.filter(client => {
                        const matchesSearch = searchTerm === "" || 
                          client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.industry?.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchesStatus = statusFilter === "all" || 
                          (statusFilter === "active" && client.is_active) ||
                          (statusFilter === "inactive" && !client.is_active);
                        const matchesIndustry = industryFilter === "all" || client.industry === industryFilter;
                        return matchesSearch && matchesStatus && matchesIndustry;
                      });
                      return (
                        <Pagination
                          currentPage={clientsPage}
                          totalItems={filteredClients.length}
                          itemsPerPage={clientsPerPage}
                          onPageChange={setClientsPage}
                          onItemsPerPageChange={setClientsPerPage}
                          className="border-t border-gray-200 px-4"
                        />
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {currentView === "contacts" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Contactos de Clientes</h3>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowContactModal(true)}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                    >
                      <i className="fas fa-plus"></i>
                      Agregar Contacto
                    </button>
                    <button 
                      onClick={loadData}
                      className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
                    >
                      <i className="fas fa-sync"></i>
                      Actualizar
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando contactos...</p>
                  </div>
                ) : clients.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <i className="fas fa-address-book text-5xl mb-4 text-gray-300"></i>
                    <p className="text-lg">No hay clientes registrados</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {clients
                        .slice((contactsPage - 1) * contactsPerPage, contactsPage * contactsPerPage)
                        .map((client) => (
                        <div key={client.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">{client.company_name}</h4>
                              <p className="text-sm text-gray-500">{client.industry}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              client.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {client.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                          
                          {client.contacts && client.contacts.length > 0 ? (
                            <div className="space-y-3">
                              {client.contacts.map((contact: any) => (
                                <div key={contact.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">
                                      {contact.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">{contact.name}</p>
                                      <p className="text-sm text-gray-500">{contact.position}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-gray-600">{contact.email}</p>
                                    <p className="text-sm text-gray-600">{contact.phone}</p>
                                    {contact.is_primary && (
                                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                        Principal
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-400">
                              <i className="fas fa-user-slash mb-2"></i>
                              <p className="text-sm">No hay contactos registrados para este cliente</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Pagination for contacts */}
                    <Pagination
                      currentPage={contactsPage}
                      totalItems={clients.length}
                      itemsPerPage={contactsPerPage}
                      onPageChange={setContactsPage}
                      onItemsPerPageChange={setContactsPerPage}
                      className="mt-4"
                    />
                  </>
                )}
              </div>
            )}

            {currentView === "contracts" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Contratos</h3>
                  <button
                    onClick={() => setShowContractForm(!showContractForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <i className={`fas ${showContractForm ? 'fa-times' : 'fa-plus'}`}></i>
                    {showContractForm ? "Cancelar" : "Subir Contrato"}
                  </button>
                </div>

                {/* Upload Form */}
                {showContractForm && (
                  <form onSubmit={handleContractUpload} className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">
                      <i className="fas fa-upload mr-2 text-green-600"></i>Subir Nuevo Contrato
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                        <select
                          value={contractForm.client}
                          onChange={(e) => setContractForm({ ...contractForm, client: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          required
                        >
                          <option value="">Seleccionar cliente...</option>
                          {clients.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.company_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Título del Contrato *</label>
                        <input
                          type="text"
                          value={contractForm.title}
                          onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Ej: Contrato de servicios 2026"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                        <input
                          type="date"
                          value={contractForm.start_date}
                          onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin</label>
                        <input
                          type="date"
                          value={contractForm.end_date}
                          onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <textarea
                          value={contractForm.description}
                          onChange={(e) => setContractForm({ ...contractForm, description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          rows={2}
                          placeholder="Descripción opcional del contrato..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Archivo del Contrato *</label>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 cursor-pointer">
                            <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${contractForm.file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400'}`}>
                              {contractForm.file ? (
                                <div className="flex items-center justify-center gap-2 text-green-700">
                                  <i className="fas fa-file-check"></i>
                                  <span className="font-medium">{contractForm.file.name}</span>
                                  <span className="text-sm text-green-500">({(contractForm.file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                </div>
                              ) : (
                                <div className="text-gray-500">
                                  <i className="fas fa-cloud-upload-alt text-2xl mb-1"></i>
                                  <p className="text-sm">Haz clic para seleccionar archivo (PDF, DOC, DOCX)</p>
                                </div>
                              )}
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.xls,.xlsx"
                              onChange={(e) => setContractForm({ ...contractForm, file: e.target.files?.[0] || null })}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => { setShowContractForm(false); setContractForm({ client: "", title: "", description: "", file: null, start_date: "", end_date: "" }); }}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={contractUploading}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {contractUploading ? (
                          <><i className="fas fa-spinner fa-spin"></i> Subiendo...</>
                        ) : (
                          <><i className="fas fa-upload"></i> Subir Contrato</>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* Contracts List */}
                {loading ? (
                  <div className="text-center py-12">
                    <i className="fas fa-spinner fa-spin text-3xl text-green-500"></i>
                    <p className="mt-2 text-gray-500">Cargando contratos...</p>
                  </div>
                ) : contracts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <i className="fas fa-file-contract text-5xl mb-4 text-gray-300"></i>
                    <p className="text-lg">No hay contratos registrados</p>
                    <p className="text-sm mt-2">Sube tu primer contrato usando el botón de arriba</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contracts.map((contract: any) => (
                      <div key={contract.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <i className="fas fa-file-contract text-blue-600 text-xl"></i>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{contract.title}</h4>
                              <p className="text-sm text-gray-600 mt-0.5">
                                <i className="fas fa-building mr-1"></i>
                                {contract.client_name}
                              </p>
                              {contract.description && (
                                <p className="text-sm text-gray-500 mt-1">{contract.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                {contract.start_date && (
                                  <span><i className="fas fa-calendar-alt mr-1"></i>Inicio: {new Date(contract.start_date).toLocaleDateString('es-MX')}</span>
                                )}
                                {contract.end_date && (
                                  <span><i className="fas fa-calendar-times mr-1"></i>Fin: {new Date(contract.end_date).toLocaleDateString('es-MX')}</span>
                                )}
                                <span><i className="fas fa-clock mr-1"></i>Subido: {new Date(contract.created_at).toLocaleDateString('es-MX')}</span>
                                {contract.uploaded_by_name && (
                                  <span><i className="fas fa-user mr-1"></i>{contract.uploaded_by_name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              contract.status === 'active' ? 'bg-green-100 text-green-800' :
                              contract.status === 'expired' ? 'bg-red-100 text-red-800' :
                              contract.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {contract.status === 'active' ? 'Activo' :
                               contract.status === 'expired' ? 'Expirado' :
                               contract.status === 'cancelled' ? 'Cancelado' : 'Borrador'}
                            </span>
                            {contract.file_url && (
                              <button
                                onClick={() => {
                                  setPdfPreviewUrl(contract.file_url);
                                  setPdfPreviewTitle(contract.title);
                                }}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Ver documento"
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                            )}
                            {contract.file_url && (
                              <a
                                href={contract.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Descargar"
                              >
                                <i className="fas fa-download"></i>
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteContract(contract.id, contract.title)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentView === "history" && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Historial</h3>
                <div className="text-center py-16 text-gray-400">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                    <i className="fas fa-history text-4xl text-gray-300"></i>
                  </div>
                  <p className="text-lg font-medium text-gray-500">Sección en Desarrollo</p>
                  <p className="text-sm mt-2">El historial de interacciones con clientes estará disponible próximamente</p>
                  <span className="inline-block mt-4 px-4 py-1.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                    <i className="fas fa-tools mr-1"></i> En desarrollo
                  </span>
                </div>
              </div>
            )}

            {currentView === "statistics" && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Estadísticas</h3>
                <div className="text-center py-16 text-gray-400">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                    <i className="fas fa-chart-bar text-4xl text-gray-300"></i>
                  </div>
                  <p className="text-lg font-medium text-gray-500">Sección en Desarrollo</p>
                  <p className="text-sm mt-2">Las métricas y estadísticas de clientes estarán disponibles próximamente</p>
                  <span className="inline-block mt-4 px-4 py-1.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                    <i className="fas fa-tools mr-1"></i> En desarrollo
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl border-l-4 border-green-500 p-4 max-w-md">
            <div className="flex items-center">
              <i className="fas fa-check-circle text-green-500 text-xl mr-3"></i>
              <p className="text-gray-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}


      {/* Add Contact Modal */}
        {showContactModal && (
          <AddContactModal
            clients={clients}
            onClose={() => setShowContactModal(false)}
            onSuccess={() => {
              setShowContactModal(false);
              loadData();
            }}
          />
        )}

      {/* PDF Preview Modal */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setPdfPreviewUrl(null); setPdfPreviewTitle(""); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[95vw] h-[92vh] max-w-6xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-file-pdf text-indigo-600 text-lg"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{pdfPreviewTitle}</h3>
                  <p className="text-xs text-gray-500">Vista previa del documento</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <i className="fas fa-external-link-alt"></i>
                  Abrir en nueva pestaña
                </a>
                <a
                  href={pdfPreviewUrl}
                  download
                  className="flex items-center gap-2 px-4 py-2 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <i className="fas fa-download"></i>
                  Descargar
                </a>
                <button
                  onClick={() => { setPdfPreviewUrl(null); setPdfPreviewTitle(""); }}
                  className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors ml-1"
                  title="Cerrar"
                >
                  <i className="fas fa-times text-lg"></i>
                </button>
              </div>
            </div>
            {/* PDF Viewer */}
            <div className="flex-1 bg-gray-100">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-0"
                title={`Vista previa: ${pdfPreviewTitle}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
    
  );
}
