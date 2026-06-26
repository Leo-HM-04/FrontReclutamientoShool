"use client";

import { useState, useEffect } from "react";
import { useModal } from '@/context/ModalContext';
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Question {
  id: number;
  question_text: string;
  question_type: string;
  options: string[];
  points: number;
  order: number;
  is_required: boolean;
  help_text: string;
}

interface Template {
  id: number;
  title: string;
  description: string;
  category: string;
  duration_minutes: number;
  passing_score: number;
}

export default function PublicEvaluationPage() {
  const params = useParams();
  const token = params.token as string;
  const { showAlert } = useModal();

  const [template, setTemplate] = useState<Template | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [candidateInfo, setCandidateInfo] = useState({
    name: "",
    email: "",
    phone: ""
  });

  useEffect(() => {
    fetchEvaluation();
  }, [token]);

  const fetchEvaluation = async () => {
    try {
      const response = await fetch(`${API_URL}/evaluations/public/${token}/`);
      
      if (response.ok) {
        const data = await response.json();
        setTemplate(data.template);
        setQuestions(data.questions.sort((a: Question, b: Question) => a.order - b.order));
      } else {
        setError("Evaluación no encontrada o link inválido");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Error al cargar la evaluación");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos requeridos del candidato
    if (!candidateInfo.name || !candidateInfo.email) {
      await showAlert("Por favor complete su nombre y email");
      return;
    }

    // Validar preguntas requeridas
    const missingRequired = questions
      .filter(q => q.is_required && !answers[q.id])
      .map(q => q.question_text);

    if (missingRequired.length > 0) {
      await showAlert(`Por favor responda las siguientes preguntas obligatorias:\n\n${missingRequired.join('\n')}`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/evaluations/public/${token}/submit/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_info: candidateInfo,
          answers: Object.entries(answers).map(([questionId, answer]) => ({
            question_id: questionId,
            answer_text: answer
          }))
        })
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const errorData = await response.json();
        await showAlert(`Error al enviar evaluación: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error("Error:", error);
      await showAlert("Error al enviar la evaluación");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-5xl text-blue-600 mb-4"></i>
          <p className="text-gray-600 text-lg">Cargando evaluación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <i className="fas fa-exclamation-circle text-6xl text-red-500 mb-4"></i>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-check text-4xl text-green-600"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Evaluación Enviada!</h1>
            <p className="text-gray-600">
              Gracias por completar la evaluación. Tus respuestas han sido guardadas exitosamente.
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <i className="fas fa-info-circle mr-2"></i>
              Nos pondremos en contacto contigo pronto con los resultados.
            </p>
          </div>
          
          <div className="text-sm text-gray-500">
            Puedes cerrar esta ventana
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{template?.title}</h1>
            <p className="text-gray-600">{template?.description}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 rounded-lg p-3">
              <i className="fas fa-clock text-blue-600 mb-1"></i>
              <p className="text-sm text-gray-600">Duración</p>
              <p className="font-semibold text-gray-900">{template?.duration_minutes} min</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <i className="fas fa-question-circle text-purple-600 mb-1"></i>
              <p className="text-sm text-gray-600">Preguntas</p>
              <p className="font-semibold text-gray-900">{questions.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <i className="fas fa-chart-line text-green-600 mb-1"></i>
              <p className="text-sm text-gray-600">Puntaje Mínimo</p>
              <p className="font-semibold text-gray-900">{template?.passing_score}%</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Candidato */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              <i className="fas fa-user text-blue-600 mr-2"></i>
              Tu Información
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={candidateInfo.name}
                  onChange={(e) => setCandidateInfo(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Juan Pérez"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={candidateInfo.email}
                  onChange={(e) => setCandidateInfo(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="juan@ejemplo.com"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  value={candidateInfo.phone}
                  onChange={(e) => setCandidateInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="722 555 1234"
                />
              </div>
            </div>
          </div>

          {/* Preguntas */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              <i className="fas fa-clipboard-list text-purple-600 mr-2"></i>
              Preguntas
            </h2>

            <div className="space-y-6">
              {questions.map((question, index) => (
                <div key={question.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      {index + 1}. {question.question_text}
                      {question.is_required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {question.help_text && (
                      <p className="text-sm text-gray-500 italic mb-2">{question.help_text}</p>
                    )}
                  </div>

                  {question.question_type === "multiple_choice" && (
                    <div className="space-y-2">
                      {(question.options || []).map((option, i) => (
                        <label key={i} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name={`question_${question.id}`}
                            value={option}
                            checked={answers[question.id] === option}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="mr-3 h-4 w-4"
                          />
                          <span className="text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.question_type === "true_false" && (
                    <div className="space-y-2">
                      {["Verdadero", "Falso"].map((option) => (
                        <label key={option} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name={`question_${question.id}`}
                            value={option}
                            checked={answers[question.id] === option}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="mr-3 h-4 w-4"
                          />
                          <span className="text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {(question.question_type === "short_answer" || question.question_type === "short_text") && (
                    <input
                      type="text"
                      value={answers[question.id] || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Tu respuesta..."
                    />
                  )}

                  {(question.question_type === "essay" || question.question_type === "long_text") && (
                    <textarea
                      value={answers[question.id] || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Tu respuesta detallada..."
                    />
                  )}

                  {(question.question_type === "rating" || question.question_type === "scale") && (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <label key={rating} className={`flex items-center justify-center w-12 h-12 border-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors ${answers[question.id] === rating.toString() ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
                          <input
                            type="radio"
                            name={`question_${question.id}`}
                            value={rating.toString()}
                            checked={answers[question.id] === rating.toString()}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="sr-only"
                          />
                          <span className={`text-lg font-semibold ${answers[question.id] === rating.toString() ? 'text-blue-600' : 'text-gray-400'}`}>
                            {rating}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.question_type === "code" && (
                    <textarea
                      value={answers[question.id] || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      rows={8}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-gray-900 text-green-400"
                      placeholder="// Escribe tu código aquí..."
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Botón de Enviar */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Enviando...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Enviar Evaluación
                </>
              )}
            </button>
            
            <p className="text-center text-sm text-gray-500 mt-4">
              Al enviar, aceptas que tus respuestas sean revisadas por el equipo de reclutamiento
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
