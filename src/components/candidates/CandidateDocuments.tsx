"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";

interface CandidateDocumentsProps {
  candidateId: number;
}

export default function CandidateDocuments({ candidateId }: CandidateDocumentsProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [candidateId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/candidates/candidates/${candidateId}/documents/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      cv: "fa-file-pdf",
      cover_letter: "fa-file-alt",
      certificate: "fa-certificate",
      portfolio: "fa-folder",
      other: "fa-file",
    };
    return icons[type] || "fa-file";
  };

  const getDocumentColor = (type: string) => {
    const colors: { [key: string]: string } = {
      cv: "text-red-600",
      cover_letter: "text-blue-600",
      certificate: "text-green-600",
      portfolio: "text-purple-600",
      other: "text-gray-600",
    };
    return colors[type] || "text-gray-600";
  };

  const handleDownload = (doc: any) => {
    if (doc.file) {
      window.open(doc.file, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-center items-center py-8">
          <i className="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <i className="fas fa-folder text-orange-600 mr-2"></i>
        Documentos ({documents.length})
      </h4>

      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <i className="fas fa-folder-open text-4xl mb-2"></i>
          <p>No hay documentos registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <div 
              key={doc.id} 
              className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors cursor-pointer"
              onClick={() => handleDownload(doc)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <i className={`fas ${getDocumentIcon(doc.document_type)} ${getDocumentColor(doc.document_type)} text-2xl`}></i>
                  <div>
                    <h5 className="font-semibold text-gray-900">
                      {doc.document_type === 'cv' ? 'Currículum' :
                       doc.document_type === 'cover_letter' ? 'Carta de Presentación' :
                       doc.document_type === 'certificate' ? 'Certificado' :
                       doc.document_type === 'portfolio' ? 'Portafolio' : 'Otro'}
                    </h5>
                    {doc.description && (
                      <p className="text-sm text-gray-600">{doc.description}</p>
                    )}
                  </div>
                </div>
                <button className="text-orange-600 hover:text-orange-800">
                  <i className="fas fa-download"></i>
                </button>
              </div>
              
              <div className="text-xs text-gray-500 mt-2">
                Subido el {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '-'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
