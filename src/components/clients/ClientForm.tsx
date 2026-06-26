"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useModal } from "@/context/ModalContext";

interface ClientFormProps {
  clientId?: number;
  onSuccess?: () => void;
}

export default function ClientForm({ clientId, onSuccess }: ClientFormProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const { showAlert, showSuccess, showError } = useModal();
  
  const [formData, setFormData] = useState({
    // Información de la Empresa
    company_name: "",
    rfc: "",
    industry: "",
    website: "",
    is_active: true,
    
    // Información de Contacto
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    contact_position: "",
    
    // Dirección
    address_street: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    address_country: "México",
    
    // Notas
    notes: "",
    
    // Asignación
    assigned_to: "",
  });

  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadUsers();
    if (clientId) {
      loadClient();
    }
  }, [clientId]);

  const loadUsers = async () => {
    try {
      const usersResponse = await apiClient.getUsers();
      const usersList = (usersResponse as any).results || (Array.isArray(usersResponse) ? usersResponse : []);
      setUsers(usersList);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadClient = async () => {
    if (!clientId) return;
    
    setLoadingData(true);
    try {
      const clientData = await apiClient.getClient(clientId);
      const client = clientData as any;
      
      setFormData({
        company_name: client.company_name || "",
        rfc: client.rfc || "",
        industry: client.industry || "",
        website: client.website || "",
        is_active: client.is_active !== undefined ? client.is_active : true,
        contact_name: client.contact_name || "",
        contact_email: client.contact_email || "",
        contact_phone: client.contact_phone || "",
        contact_position: client.contact_position || "",
        address_street: client.address_street || "",
        address_city: client.address_city || "",
        address_state: client.address_state || "",
        address_zip: client.address_zip || "",
        address_country: client.address_country || "México",
        notes: client.notes || "",
        assigned_to: client.assigned_to?.toString() || "",
      });
    } catch (error) {
      console.error("Error loading client:", error);
      await showAlert("Error al cargar el cliente");
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData: any = {
        company_name: formData.company_name,
        is_active: formData.is_active,
        address_country: formData.address_country || "México",
      };

      // Campos opcionales de texto - solo agregar si tienen valor
      if (formData.rfc) submitData.rfc = formData.rfc;
      if (formData.industry) submitData.industry = formData.industry;
      if (formData.website) submitData.website = formData.website;
      if (formData.contact_name) submitData.contact_name = formData.contact_name;
      if (formData.contact_email) submitData.contact_email = formData.contact_email;
      if (formData.contact_phone) submitData.contact_phone = formData.contact_phone;
      if (formData.contact_position) submitData.contact_position = formData.contact_position;
      if (formData.address_street) submitData.address_street = formData.address_street;
      if (formData.address_city) submitData.address_city = formData.address_city;
      if (formData.address_state) submitData.address_state = formData.address_state;
      if (formData.address_zip) submitData.address_zip = formData.address_zip;
      if (formData.notes) submitData.notes = formData.notes;
      if (formData.assigned_to) submitData.assigned_to = formData.assigned_to;

      console.log('📤 Datos a enviar:', submitData);

      if (clientId) {
        await apiClient.updateClient(clientId, submitData);
        await showSuccess("Cliente actualizado exitosamente");
      } else {
        await apiClient.createClient(submitData);
        await showSuccess("Cliente creado exitosamente");
      }
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("❌ Error saving client:", error);
      console.error("❌ Error details:", error.details);
      console.error("❌ Full error object:", JSON.stringify(error, null, 2));
      
      let errorMsg = "Error desconocido";
      
      if (error.details) {
        if (typeof error.details === 'object') {
          const errorFields = Object.keys(error.details);
          if (errorFields.length > 0) {
            errorMsg = errorFields.map(field => 
              `${field}: ${JSON.stringify(error.details[field])}`
            ).join(', ');
          }
        } else {
          errorMsg = JSON.stringify(error.details);
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      await showError(`Error al guardar cliente: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center py-12">
        <i className="fas fa-spinner fa-spin text-4xl text-green-600 mr-4"></i>
        <span className="text-gray-600">Cargando datos...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900">
          {clientId ? "Editar Cliente" : "Crear Nuevo Cliente"}
        </h3>
        <p className="text-gray-600 mt-1">
          Complete la información del cliente
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Información de la Empresa */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-green-500/10 border-b-2 border-green-500 px-5 py-3.5">
            <h4 className="text-lg font-bold text-green-800 flex items-center">
              <i className="fas fa-building text-green-600 mr-2"></i>
              Información de la Empresa
            </h4>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Empresa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Ej: Tech Solutions SA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RFC <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="rfc"
                required
                value={formData.rfc}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setFormData(prev => ({ ...prev, rfc: value }));
                }}
                maxLength={13}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Ej: ABC123456XYZ"
              />
                          </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industria <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="industry"
                required
                value={formData.industry}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Ej: Tecnología, Manufactura, Servicios"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sitio Web <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                name="website"
                required
                value={formData.website}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="https://www.ejemplo.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                Cliente Activo
              </label>
              <p className="text-xs text-gray-500 mt-1">Marque si el cliente está activo actualmente</p>
            </div>
          </div>
        </div>

        {/* Información de Contacto */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-teal-500/10 border-b-2 border-teal-500 px-5 py-3.5">
            <h4 className="text-lg font-bold text-teal-800 flex items-center">
              <i className="fas fa-user text-teal-600 mr-2"></i>
              Información de Contacto
            </h4>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Contacto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="contact_name"
                required
                value={formData.contact_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Posición <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="contact_position"
                required
                value={formData.contact_position}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Ej: Director General, Gerente de RRHH"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email de Contacto <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="contact_email"
                required
                value={formData.contact_email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="contacto@empresa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono de Contacto <span className="text-gray-400 font-normal text-xs">(opcional)</span>
              </label>
              <input
                type="text"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Ej: 722 555 1234"
              />
            </div>
          </div>
        </div>

        {/* Dirección */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-purple-500/10 border-b-2 border-purple-500 px-5 py-3.5">
            <h4 className="text-lg font-bold text-purple-800 flex items-center">
              <i className="fas fa-map-marker-alt text-purple-600 mr-2"></i>
              Dirección
            </h4>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calle y Número <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address_street"
                required
                value={formData.address_street}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Ej: Av. Paseo de la Reforma 123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ciudad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address_city"
                required
                value={formData.address_city}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Ej: Toluca"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address_state"
                required
                value={formData.address_state}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Ej: Estado de México"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código Postal <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address_zip"
                required
                value={formData.address_zip}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Ej: 50000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                País <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address_country"
                required
                value={formData.address_country}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Ej: México"
              />
            </div>
          </div>
        </div>

        {/* Asignación */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-indigo-500/10 border-b-2 border-indigo-500 px-5 py-3.5">
            <h4 className="text-lg font-bold text-indigo-800 flex items-center">
              <i className="fas fa-user-tie text-indigo-600 mr-2"></i>
              Asignación
            </h4>
          </div>
          
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asignar a <span className="text-red-500">*</span>
            </label>
            <select
              required
              name="assigned_to"
              value={formData.assigned_to}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Sin asignar</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email || `Usuario #${user.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notas Internas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-500/10 border-b-2 border-gray-500 px-5 py-3.5">
            <h4 className="text-lg font-bold text-gray-800 flex items-center">
              <i className="fas fa-sticky-note text-gray-600 mr-2"></i>
              Notas Internas
            </h4>
          </div>
          
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas <span className="text-gray-400 font-normal text-xs">(opcional)</span>
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="Notas privadas para uso interno del equipo..."
            />
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex justify-end space-x-4 pt-4 border-t">
          {onSuccess && (
            <button
              type="button"
              onClick={onSuccess}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Guardando...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                {clientId ? "Actualizar Cliente" : "Crear Cliente"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
