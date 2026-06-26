"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useModal } from '@/context/ModalContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface EvaluationQuestion {
  id: number;
  template: number;
  template_name?: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer?: string;
  points: number;
  order: number;
  is_required: boolean;
}

export default function EvaluationQuestions() {
  const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<EvaluationQuestion | null>(null);
  const { showAlert, showConfirm } = useModal();
  const formRef = useRef<HTMLFormElement>(null);

  const questionTypes = [
    { value: "multiple_choice", label: "Opción Múltiple" },
    { value: "true_false", label: "Verdadero/Falso" },
    { value: "short_answer", label: "Respuesta Corta" },
    { value: "essay", label: "Ensayo" },
    { value: "rating", label: "Calificación" }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem("authToken");

    // Fetch templates
    const templatesRes = await fetch(`${API_URL}/evaluations/templates/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const templatesData: any = await templatesRes.json();
    console.log("templatesData", templatesData);

    const normalizedTemplates = Array.isArray(templatesData)
      ? templatesData
      : Array.isArray(templatesData.results)
      ? templatesData.results
      : [];

    setTemplates(normalizedTemplates);
    console.log("Templates cargados:", normalizedTemplates); // Para debug

    // Fetch questions
    const questionsRes = await fetch(`${API_URL}/evaluations/questions/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const questionsData: any = await questionsRes.json();
    console.log("questionsData", questionsData);

    const normalizedQuestions = Array.isArray(questionsData)
      ? questionsData
      : Array.isArray(questionsData.results)
      ? questionsData.results
      : Array.isArray(questionsData.questions)
      ? questionsData.questions
      : [];

    setQuestions(normalizedQuestions);
  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
    setLoading(false);
  }
};



  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm("¿Estás seguro de eliminar esta pregunta?");
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${API_URL}/evaluations/questions/${id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setQuestions(questions.filter((q) => q.id !== id));
      }
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  const handleEdit = (question: EvaluationQuestion) => {
    setSelectedQuestion(question);
    setShowModal(true);
  };

  const filteredQuestions = questions.filter((question) => {
    const matchesSearch = question.question_text
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesTemplate =
      selectedTemplate === "all" || String(question.template) === selectedTemplate;
    return matchesSearch && matchesTemplate;
  });

  const getQuestionTypeLabel = (type: string) => {
    return questionTypes.find((t) => t.value === type)?.label || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Cargando preguntas...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Preguntas de Evaluación</h3>
            <p className="text-sm text-gray-600 mt-1">
              {questions.length} preguntas registradas
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedQuestion(null);
              setShowModal(true);
            }}
            className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <i className="fas fa-plus mr-2"></i>
            Nueva Pregunta
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar preguntas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las plantillas</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <div className="text-center py-12">
          <i className="fas fa-question-circle text-5xl text-gray-300 mb-4"></i>
          <p className="text-gray-600">No se encontraron preguntas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((question, index) => (
            <div
              key={question.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-blue-700">
                      {question.order}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {getQuestionTypeLabel(question.question_type)}
                      </span>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                        {question.points} pts
                      </span>
                      {question.is_required && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                          Obligatoria
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 font-medium mb-2">{question.question_text}</p>
                    
                    {/* Options for multiple choice */}
                    {question.question_type === "multiple_choice" && question.options && (
                      <div className="mt-3 space-y-2">
                        {question.options.map((option, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <div className="w-6 h-6 border-2 border-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-xs text-gray-600">
                                {String.fromCharCode(65 + idx)}
                              </span>
                            </div>
                            <span className="text-gray-700">{option}</span>
                            {question.correct_answer === option && (
                              <i className="fas fa-check text-green-600 text-xs"></i>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      Plantilla: {question.template_name || `ID ${question.template}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEdit(question)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Editar pregunta"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    onClick={() => handleDelete(question.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Eliminar pregunta"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>

            
          ))}
        </div>

        
      )}

      {/* Modal para Crear/Editar Pregunta */}
      {showModal && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setSelectedQuestion(null); } }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col"
            style={{ width: '95vw', height: '92vh', maxWidth: '900px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-8 py-5 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <i className="fas fa-question-circle"></i>
                  {selectedQuestion ? "Editar Pregunta" : "Nueva Pregunta"}
                </h2>
                <p className="text-teal-100 text-sm mt-1">
                  {selectedQuestion ? "Modifica los datos de la pregunta" : "Configura una nueva pregunta para tus evaluaciones"}
                </p>
              </div>
              <button
                onClick={() => { setShowModal(false); setSelectedQuestion(null); }}
                className="text-white hover:bg-teal-800 rounded-full w-10 h-10 flex items-center justify-center transition"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8">
              <form ref={formRef} onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                
                const questionType = formData.get("question_type") as string;
                let options: string[] = [];
                let correctAnswer = "";

                if (questionType === "multiple_choice") {
                  const optionsInput = formData.get("options") as string;
                  options = optionsInput.split("\n").filter(opt => opt.trim());
                  correctAnswer = formData.get("correct_answer") as string;
                } else if (questionType === "true_false") {
                  options = ["Verdadero", "Falso"];
                  correctAnswer = formData.get("correct_answer") as string;
                }

                const data = {
                  template: formData.get("template") as string,
                  question_text: formData.get("question_text"),
                  question_type: questionType,
                  options: options,
                  correct_answer: correctAnswer || null,
                  points: parseFloat(formData.get("points") as string),
                  order: parseInt(formData.get("order") as string) || 0,
                  is_required: formData.get("is_required") === "on",
                  help_text: formData.get("help_text") || ""
                };

                try {
                  const token = localStorage.getItem("authToken");
                  const url = selectedQuestion
                    ? `${API_URL}/evaluations/questions/${selectedQuestion.id}/`
                    : `${API_URL}/evaluations/questions/`;
                  
                  const method = selectedQuestion ? "PUT" : "POST";

                  const response = await fetch(url, {
                    method,
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(data),
                  });

                  if (response.ok) {
                    await fetchData();
                    setShowModal(false);
                    setSelectedQuestion(null);
                  } else {
                    const error = await response.json();
                    await showAlert("Error: " + JSON.stringify(error));
                  }
                } catch (error) {
                  console.error("Error:", error);
                  await showAlert("Error al guardar la pregunta");
                }
              }}>
                {/* Template & Question Section */}
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-100 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-clipboard-list text-teal-600"></i>
                    Información de la Pregunta
                  </h3>

                  {/* Plantilla */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      <i className="fas fa-file-alt mr-1 text-teal-500"></i> Plantilla *
                    </label>
                    <select
                      name="template"
                      defaultValue={selectedQuestion?.template || ""}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                    >
                      <option value="">Seleccionar plantilla...</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Texto de la pregunta */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      <i className="fas fa-pen mr-1 text-teal-500"></i> Pregunta *
                    </label>
                    <textarea
                      name="question_text"
                      defaultValue={selectedQuestion?.question_text || ""}
                      required
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                      placeholder="Escribe la pregunta aquí..."
                    />
                  </div>
                </div>

                {/* Configuration Section */}
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-cog text-gray-600"></i>
                    Configuración
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    {/* Tipo de pregunta */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        <i className="fas fa-list mr-1 text-teal-500"></i> Tipo *
                      </label>
                      <select
                        name="question_type"
                        defaultValue={selectedQuestion?.question_type || "multiple_choice"}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                        onChange={(e) => {
                          const optionsDiv = document.getElementById("options-section");
                          const answerDiv = document.getElementById("answer-section");
                          
                          if (e.target.value === "multiple_choice") {
                            optionsDiv?.classList.remove("hidden");
                            answerDiv?.classList.remove("hidden");
                          } else if (e.target.value === "true_false") {
                            optionsDiv?.classList.add("hidden");
                            answerDiv?.classList.remove("hidden");
                          } else {
                            optionsDiv?.classList.add("hidden");
                            answerDiv?.classList.add("hidden");
                          }
                        }}
                      >
                        {questionTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Puntos */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        <i className="fas fa-star mr-1 text-teal-500"></i> Puntos *
                      </label>
                      <input
                        type="number"
                        name="points"
                        defaultValue={selectedQuestion?.points || 10}
                        required
                        min="0"
                        step="0.5"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                      />
                    </div>

                    {/* Orden */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        <i className="fas fa-sort-numeric-up mr-1 text-teal-500"></i> Orden
                      </label>
                      <input
                        type="number"
                        name="order"
                        defaultValue={selectedQuestion?.order || 0}
                        min="0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                      />
                    </div>
                  </div>

                  {/* Es requerida - styled as card */}
                  <label className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-300 cursor-pointer hover:bg-gray-50 transition w-fit">
                    <input
                      type="checkbox"
                      name="is_required"
                      id="is_required"
                      defaultChecked={selectedQuestion?.is_required !== false}
                      className="h-5 w-5 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">Pregunta obligatoria</span>
                  </label>
                </div>

                {/* Options & Answer Section */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-check-double text-amber-600"></i>
                    Opciones y Respuesta
                  </h3>

                  {/* Opciones (solo para opción múltiple) */}
                  <div id="options-section" className={`mb-4 ${selectedQuestion?.question_type === "multiple_choice" || !selectedQuestion ? "" : "hidden"}`}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      <i className="fas fa-list-ol mr-1 text-amber-500"></i> Opciones (una por línea)
                    </label>
                    <textarea
                      name="options"
                      defaultValue={selectedQuestion?.options?.join("\n") || ""}
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                      placeholder="Opción A&#10;Opción B&#10;Opción C&#10;Opción D"
                    />
                  </div>

                  {/* Respuesta correcta */}
                  <div id="answer-section" className={
                    selectedQuestion?.question_type === "multiple_choice" || selectedQuestion?.question_type === "true_false" || !selectedQuestion ? "" : "hidden"
                  }>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      <i className="fas fa-check-circle mr-1 text-green-500"></i> Respuesta Correcta
                    </label>
                    {(!selectedQuestion || selectedQuestion.question_type === "true_false") && (
                      <select
                        name="correct_answer"
                        defaultValue={selectedQuestion?.correct_answer || ""}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Verdadero">Verdadero</option>
                        <option value="Falso">Falso</option>
                      </select>
                    )}
                    {selectedQuestion?.question_type === "multiple_choice" && (
                      <input
                        type="text"
                        name="correct_answer"
                        defaultValue={selectedQuestion?.correct_answer || ""}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                        placeholder="Ej: Opción A"
                      />
                    )}
                  </div>
                </div>

                {/* Help Text Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-lightbulb text-blue-600"></i>
                    Ayuda para el Candidato
                  </h3>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      <i className="fas fa-comment-dots mr-1 text-blue-500"></i> Texto de Ayuda (opcional)
                    </label>
                    <textarea
                      name="help_text"
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="Instrucciones o pistas para el candidato..."
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 px-8 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end gap-4">
              <button
                type="button"
                onClick={() => { setShowModal(false); setSelectedQuestion(null); }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => formRef.current?.requestSubmit()}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:to-cyan-700 font-semibold shadow-lg transition"
              >
                <i className="fas fa-save mr-2"></i>
                {selectedQuestion ? "Actualizar" : "Crear"} Pregunta
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
