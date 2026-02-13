"use client";

import { useState, useEffect } from "react";
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
      selectedTemplate === "all" || question.template === parseInt(selectedTemplate);
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
      {showModal && (
        <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedQuestion ? "Editar Pregunta" : "Nueva Pregunta"}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedQuestion(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                
                const questionType = formData.get("question_type") as string;
                let options: string[] = [];
                let correctAnswer = "";

                // Si es opción múltiple, obtener las opciones
                if (questionType === "multiple_choice") {
                  const optionsInput = formData.get("options") as string;
                  options = optionsInput.split("\n").filter(opt => opt.trim());
                  correctAnswer = formData.get("correct_answer") as string;
                } else if (questionType === "true_false") {
                  options = ["Verdadero", "Falso"];
                  correctAnswer = formData.get("correct_answer") as string;
                }

                const data = {
                  template: parseInt(formData.get("template") as string),
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
                <div className="space-y-4">
                  {/* Plantilla */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plantilla *
                    </label>
                    <select
                      name="template"
                      defaultValue={selectedQuestion?.template || ""}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pregunta *
                    </label>
                    <textarea
                      name="question_text"
                      defaultValue={selectedQuestion?.question_text || ""}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Escribe la pregunta aquí"
                    />
                  </div>

                  {/* Tipo de pregunta */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Pregunta *
                    </label>
                    <select
                      name="question_type"
                      defaultValue={selectedQuestion?.question_type || "multiple_choice"}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => {
                        // Mostrar/ocultar campos según el tipo
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

                  {/* Opciones (solo para opción múltiple) */}
                  <div id="options-section" className={selectedQuestion?.question_type === "multiple_choice" ? "" : "hidden"}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opciones (una por línea)
                    </label>
                    <textarea
                      name="options"
                      defaultValue={selectedQuestion?.options?.join("\n") || ""}
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="A) Opción 1&#10;B) Opción 2&#10;C) Opción 3&#10;D) Opción 4"
                    />
                  </div>

                  {/* Respuesta correcta */}
                  <div id="answer-section" className={
                    selectedQuestion?.question_type === "multiple_choice" || selectedQuestion?.question_type === "true_false" ? "" : "hidden"
                  }>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Respuesta Correcta
                    </label>
                    {(!selectedQuestion || selectedQuestion.question_type === "true_false") && (
                      <select
                        name="correct_answer"
                        defaultValue={selectedQuestion?.correct_answer || ""}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: A) Opción 1"
                      />
                    )}
                  </div>

                  {/* Puntos */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Puntos *
                    </label>
                    <input
                      type="number"
                      name="points"
                      defaultValue={selectedQuestion?.points || 10}
                      required
                      min="0"
                      step="0.5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Orden */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Orden
                    </label>
                    <input
                      type="number"
                      name="order"
                      defaultValue={selectedQuestion?.order || 0}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Texto de ayuda */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Texto de Ayuda (opcional)
                    </label>
                    <textarea
                      name="help_text"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Instrucciones o pistas para el candidato"
                    />
                  </div>

                  {/* Es requerida */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_required"
                      id="is_required"
                      defaultChecked={selectedQuestion?.is_required !== false}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_required" className="ml-2 block text-sm text-gray-700">
                      Pregunta obligatoria
                    </label>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedQuestion(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {selectedQuestion ? "Actualizar" : "Crear"} Pregunta
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
