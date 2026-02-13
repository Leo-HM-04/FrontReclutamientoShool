"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";

interface CandidateNotesProps {
  candidateId: number;
}

export default function CandidateNotes({ candidateId }: CandidateNotesProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [candidateId]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/candidates/candidates/${candidateId}/notes/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error("Error loading notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: { bg: string; text: string } } = {
      general: { bg: "bg-blue-100", text: "text-blue-700" },
      interview: { bg: "bg-purple-100", text: "text-purple-700" },
      technical: { bg: "bg-green-100", text: "text-green-700" },
      feedback: { bg: "bg-yellow-100", text: "text-yellow-700" },
      important: { bg: "bg-red-100", text: "text-red-700" },
    };
    return colors[category] || colors.general;
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
        <i className="fas fa-sticky-note text-green-600 mr-2"></i>
        Notas ({notes.length})
      </h4>

      {notes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <i className="fas fa-sticky-note text-4xl mb-2"></i>
          <p>No hay notas registradas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => {
            const categoryColors = getCategoryColor(note.category);
            return (
              <div key={note.id} className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColors.bg} ${categoryColors.text}`}>
                        {note.category === 'general' ? 'General' :
                         note.category === 'interview' ? 'Entrevista' :
                         note.category === 'technical' ? 'Técnico' :
                         note.category === 'feedback' ? 'Feedback' :
                         note.category === 'important' ? 'Importante' : note.category}
                      </span>
                      {note.is_important && (
                        <span className="text-red-500">
                          <i className="fas fa-exclamation-circle"></i>
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <span>
                    <i className="fas fa-user mr-1"></i>
                    {note.created_by_name || 'Usuario'}
                  </span>
                  <span>
                    {note.created_at ? new Date(note.created_at).toLocaleString() : '-'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
