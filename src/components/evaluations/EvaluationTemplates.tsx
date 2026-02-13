"use client";

import { useState, useEffect } from "react";
import { useModal } from "@/context/ModalContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface EvaluationTemplate {
  id: number;
  title: string;
  description: string;
  category: string;
  duration_minutes: number;
  passing_score: number;
  is_active: boolean;
  is_template: boolean;
  created_at: string;
  questions_count?: number;
}

interface Question {
  id?: number;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string | null;
  points: number;
  order: number;
  is_required: boolean;
  help_text: string;
}

export default function EvaluationTemplates() {
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EvaluationTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [questionCount, setQuestionCount] = useState(0);
  const [existingQuestions, setExistingQuestions] = useState<Question[]>([]);
  const [editingQuestions, setEditingQuestions] = useState<{[key: number]: boolean}>({});
  const [newQuestionsInEdit, setNewQuestionsInEdit] = useState<Question[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const { showConfirm, showAlert, showSuccess, showError } = useModal();

  const categories = [
    { value: "technical", label: "Técnica" },
    { value: "behavioral", label: "Conductual" },
    { value: "cognitive", label: "Cognitiva" },
    { value: "cultural", label: "Cultural Fit" },
    { value: "leadership", label: "Liderazgo" },
    { value: "other", label: "Otra" }
  ];

  const questionTypes = [
    { value: "multiple_choice", label: "Opción Múltiple" },
    { value: "true_false", label: "Verdadero/Falso" },
    { value: "short_answer", label: "Respuesta Corta" },
    { value: "essay", label: "Ensayo" },
    { value: "rating", label: "Calificación" }
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate && showModal) {
      fetchTemplateQuestions(selectedTemplate.id);
    } else if (!selectedTemplate) {
      setExistingQuestions([]);
    }
  }, [selectedTemplate, showModal]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      // Agregar parámetro para traer todas (activas e inactivas)
      const response = await fetch(`${API_URL}/evaluations/templates/?all=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateQuestions = async (templateId: number) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/evaluations/questions/?template=${templateId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const questions = Array.isArray(data) ? data : data.results || [];
        setExistingQuestions(questions);
        console.log('Preguntas cargadas:', questions);
      }
    } catch (error) {
      console.error("Error cargando preguntas:", error);
    }
  };

  const handleDelete = async (id: number) => {
    const template = templates.find(t => t.id === id);
    
    console.log("🗑️ Intentando eliminar plantilla:");
    console.log("ID:", id);
    console.log("Template encontrado:", template);
    
    if (!template) {
      await showAlert("❌ Error: No se encontró la plantilla en la lista local");
      return;
    }
    
    const confirmed = await showConfirm(`¿Estás seguro de eliminar la plantilla "${template.title}"? Esta acción no se puede deshacer.`);
      if (!confirmed) return;
    
    try {
      const token = localStorage.getItem("authToken");
      const url = `${API_URL}/evaluations/templates/${id}/`;
      
      console.log("🌐 Llamando a:", url);
      
      const response = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log("📊 Response status:", response.status);
      
      if (response.ok) {
        setTemplates(templates.filter((t) => t.id !== id));
        await showAlert("✅ Plantilla eliminada exitosamente");
      } else if (response.status === 404) {
        const error = await response.json();
        console.error("❌ Error 404:", error);
        await showAlert(`❌ No se encontró la plantilla. Puede que no tengas permisos para eliminarla o ya fue eliminada.`);
        // Recargar plantillas para sincronizar
        await fetchTemplates();
      } else {
        const error = await response.json();
        console.error("❌ Error:", error);
        await showAlert(`❌ Error al eliminar: ${error.detail || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error("❌ Error completo:", error);
      await showAlert("❌ Error al eliminar la plantilla");
    }
  };

  const handleDuplicate = async (id: number) => {
    const template = templates.find(t => t.id === id);
    const confirmed = await showConfirm(`¿Duplicar la plantilla "${template?.title}"?`);
    if (!confirmed) return;
    
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/evaluations/templates/${id}/duplicate/`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });
      
      if (response.ok) {
        await fetchTemplates();
        await showAlert("✅ Plantilla duplicada exitosamente (inactiva por defecto, actívala con el toggle)");
      } else {
        const error = await response.json();
        await showAlert(`❌ Error al duplicar: ${error.detail || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error("Error:", error);
      await showAlert("❌ Error al duplicar la plantilla");
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/evaluations/templates/${id}/`, {
        method: "PATCH",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      
      if (response.ok) {
        // Actualizar localmente sin recargar todo
        setTemplates(templates.map(t => 
          t.id === id ? { ...t, is_active: !currentStatus } : t
        ));
        await showAlert(`✅ Plantilla ${!currentStatus ? 'activada' : 'desactivada'} exitosamente`);
      } else {
        const error = await response.json();
        await showAlert(`❌ Error: ${error.detail || 'No se pudo cambiar el estado'}`);
      }
    } catch (error) {
      console.error("Error:", error);
      await showAlert("❌ Error al cambiar el estado");
    }
  };


  const handleDeleteQuestion = async (questionId: number) => {
    const confirmed = await showConfirm("¿Eliminar esta pregunta?");
    if (!confirmed) return;
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/evaluations/questions/${questionId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setExistingQuestions(existingQuestions.filter((q) => q.id !== questionId));
        await showAlert("Pregunta eliminada exitosamente");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleUpdateQuestion = async (questionId: number, data: Question) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/evaluations/questions/${questionId}/`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        await showAlert("Pregunta actualizada exitosamente");
        if (selectedTemplate) {
          fetchTemplateQuestions(selectedTemplate.id);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      await showAlert("Error al actualizar la pregunta");
    }
  };

  const handleShare = async (templateId: number) => {
    setShareLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/evaluations/templates/${templateId}/generate_share_link/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const publicLink = `${window.location.origin}/evaluacion-publica/${data.share_token}`;
        setShareLink(publicLink);
        setShowShareModal(true);
      } else {
        await showAlert("Error al generar link de compartir");
      }
    } catch (error) {
      console.error("Error:", error);
      await showAlert("Error al generar link de compartir");
    } finally {
      setShareLoading(false);
    }
  };

  const copyToClipboard = async () => {("✅ Link copiado al portapapeles!");
  };

  const addQuestion = () => {
    const container = document.getElementById("questions-container");
    const index = questionCount;
    
    const questionDiv = document.createElement("div");
    questionDiv.setAttribute("data-question-index", index.toString());
    questionDiv.className = "border border-gray-300 rounded-lg p-4 mb-4 bg-white";
    questionDiv.innerHTML = `
      <div class="flex justify-between items-center mb-3">
        <h5 class="font-semibold text-gray-900">Pregunta ${index + 1}</h5>
        <button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-600 hover:text-red-800">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Pregunta *</label>
          <textarea name="question_text_${index}" rows="2" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></textarea>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <select name="question_type_${index}" onchange="handleQuestionTypeChange(${index}, this.value)" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="multiple_choice">Opción Múltiple</option>
              <option value="true_false">Verdadero/Falso</option>
              <option value="short_answer">Respuesta Corta</option>
              <option value="essay">Ensayo</option>
              <option value="rating">Calificación (1-5)</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Puntos *</label>
            <input type="number" name="points_${index}" value="10" min="0" step="0.5" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Orden</label>
            <input type="number" name="order_${index}" value="${index}" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>

        <div id="options_container_${index}">
          <div id="options_section_${index}">
            <label class="block text-sm font-medium text-gray-700 mb-1">Opciones (una por línea) *</label>
            <textarea name="options_${index}" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Opción A&#10;Opción B&#10;Opción C&#10;Opción D"></textarea>
          </div>

          <div id="answer_section_${index}" class="mt-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">Respuesta Correcta</label>
            <input type="text" name="correct_answer_${index}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Escribe la opción correcta exacta" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Texto de Ayuda (opcional)</label>
          <input type="text" name="help_text_${index}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Instrucciones adicionales para el candidato" />
        </div>

        <div class="flex items-center">
          <input type="checkbox" name="is_required_${index}" id="required_${index}" checked class="h-4 w-4 rounded" />
          <label for="required_${index}" class="ml-2 text-sm">Obligatoria</label>
        </div>
      </div>
    `;
    
    container?.appendChild(questionDiv);
    setQuestionCount(index + 1);
  };

  const addQuestionToEdit = () => {
    const newQuestion: Question = {
      question_text: "",
      question_type: "multiple_choice",
      options: [],
      correct_answer: null,
      points: 10,
      order: existingQuestions.length + newQuestionsInEdit.length,
      is_required: false,
      help_text: ""
    };
    setNewQuestionsInEdit([...newQuestionsInEdit, newQuestion]);
  };

  const updateNewQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...newQuestionsInEdit];
    updated[index] = { ...updated[index], [field]: value };
    setNewQuestionsInEdit(updated);
  };

  const removeNewQuestion = (index: number) => {
    setNewQuestionsInEdit(newQuestionsInEdit.filter((_, i) => i !== index));
  };

  const toggleEditQuestion = (questionId: number) => {
    setEditingQuestions({
      ...editingQuestions,
      [questionId]: !editingQuestions[questionId]
    });
  };

  const updateExistingQuestion = async (questionId: number, updatedData: Partial<Question>) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/evaluations/questions/${questionId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });

      if (response.ok) {
        // Recargar preguntas
        if (selectedTemplate) {
          await fetchTemplateQuestions(selectedTemplate.id);
        }
        setEditingQuestions({ ...editingQuestions, [questionId]: false });
        await showAlert("✅ Pregunta actualizada");
      } else {
        await showAlert("❌ Error al actualizar pregunta");
      }
    } catch (error) {
      console.error("Error:", error);
      await showAlert("❌ Error al actualizar pregunta");
    }
  };

  useEffect(() => {
    (window as any).handleQuestionTypeChange = (index: number, type: string) => {
      const optionsContainer = document.getElementById(`options_container_${index}`);
      
      if (optionsContainer) {
        if (type === "multiple_choice") {
          optionsContainer.innerHTML = `
            <div id="options_section_${index}">
              <label class="block text-sm font-medium text-gray-700 mb-1">Opciones (una por línea) *</label>
              <textarea name="options_${index}" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Opción A&#10;Opción B&#10;Opción C&#10;Opción D"></textarea>
            </div>
            <div id="answer_section_${index}" class="mt-3">
              <label class="block text-sm font-medium text-gray-700 mb-1">Respuesta Correcta</label>
              <input type="text" name="correct_answer_${index}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Escribe la opción correcta exacta" />
            </div>
          `;
        } else if (type === "true_false") {
          optionsContainer.innerHTML = `
            <div id="answer_section_${index}">
              <label class="block text-sm font-medium text-gray-700 mb-1">Respuesta Correcta *</label>
              <select name="correct_answer_${index}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Seleccionar...</option>
                <option value="Verdadero">Verdadero</option>
                <option value="Falso">Falso</option>
              </select>
            </div>
          `;
        } else if (type === "short_answer") {
          optionsContainer.innerHTML = `
            <div id="answer_section_${index}">
              <label class="block text-sm font-medium text-gray-700 mb-1">Respuesta Correcta (opcional)</label>
              <input type="text" name="correct_answer_${index}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Respuesta esperada para auto-calificación" />
            </div>
          `;
        } else if (type === "essay" || type === "rating") {
          optionsContainer.innerHTML = `
            <div class="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">
              ${type === "essay" ? "Las respuestas de ensayo requieren calificación manual." : "El candidato seleccionará un valor del 1 al 5."}
            </div>
          `;
        }
      }
    };
  }, []);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || template.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Plantillas de Evaluación</h3>
            <p className="text-sm text-gray-600 mt-1">{templates.length} plantillas</p>
          </div>
          <button onClick={() => { setSelectedTemplate(null); setShowModal(true); setQuestionCount(0); }} className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <i className="fas fa-plus mr-2"></i>Nueva Plantilla
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg" />
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="all">Todas</option>
            {categories.map((cat) => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
          </select>
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <i className="fas fa-file-alt text-6xl text-gray-300 mb-4"></i>
          <p className="text-gray-500">No hay plantillas</p>
          <button onClick={() => { setShowModal(true); setQuestionCount(0); }} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">
            <i className="fas fa-plus mr-2"></i>Crear primera plantilla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{template.title}</h4>
                    <div className="flex items-center gap-2">
                      {/* Toggle de estado */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(template.id, template.is_active);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          template.is_active ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                        title={template.is_active ? 'Desactivar plantilla' : 'Activar plantilla'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            template.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                        template.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {template.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div><span className="text-gray-500">Categoría:</span><p className="font-medium">{categories.find((c) => c.value === template.category)?.label}</p></div>
                <div><span className="text-gray-500">Duración:</span><p className="font-medium">{template.duration_minutes} min</p></div>
                <div><span className="text-gray-500">Puntaje mínimo:</span><p className="font-medium">{template.passing_score}%</p></div>
                <div><span className="text-gray-500">Preguntas:</span><p className="font-medium">{template.questions_count || 0}</p></div>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button onClick={() => { setSelectedTemplate(template); setShowModal(true); }} className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"><i className="fas fa-edit mr-2"></i>Editar</button>
                <button onClick={() => handleShare(template.id)} className="px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded hover:bg-purple-100" title="Compartir"><i className="fas fa-share-alt"></i></button>
                <button onClick={() => handleDuplicate(template.id)} className="px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100"><i className="fas fa-copy"></i></button>
                <button onClick={() => handleDelete(template.id)} className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"><i className="fas fa-trash"></i></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div 
          className="fixed top-16 left-0 right-0 bottom-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{selectedTemplate ? "Editar" : "Nueva"} Plantilla</h3>
                <button onClick={() => { setShowModal(false); setSelectedTemplate(null); }} className="text-gray-400 hover:text-gray-600">
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                
                const data = {
                  title: formData.get("title"),
                  description: formData.get("description"),
                  category: formData.get("category"),
                  duration_minutes: parseInt(formData.get("duration_minutes") as string),
                  passing_score: parseFloat(formData.get("passing_score") as string),
                  is_active: formData.get("is_active") === "on",
                  is_template: true
                };

                try {
                  const token = localStorage.getItem("authToken");
                  const url = selectedTemplate ? `${API_URL}/evaluations/templates/${selectedTemplate.id}/` : `${API_URL}/evaluations/templates/`;
                  const response = await fetch(url, { method: selectedTemplate ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });

                  if (response.ok) {
                    const createdTemplate = await response.json();

                    // Guardar nuevas preguntas si estamos en modo edición
                    if (selectedTemplate && newQuestionsInEdit.length > 0) {
                      const questions = newQuestionsInEdit.map((q, idx) => ({
                        question_text: q.question_text,
                        question_type: q.question_type,
                        options: q.options,
                        correct_answer: q.correct_answer,
                        points: q.points,
                        order: existingQuestions.length + idx,
                        is_required: q.is_required,
                        help_text: q.help_text
                      }));

                      if (questions.length > 0 && questions.every(q => q.question_text)) {
                        const questionsResponse = await fetch(`${API_URL}/evaluations/questions/bulk_create/`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ template_id: selectedTemplate.id, questions }),
                        });
                        
                        if (!questionsResponse.ok) {
                          const error = await questionsResponse.json();
                          console.error('Error al crear nuevas preguntas:', error);
                        }
                      }
                      setNewQuestionsInEdit([]);
                    }
                    
                    if (!selectedTemplate) {
                      const questionElements = document.querySelectorAll('[data-question-index]');
                      if (questionElements.length > 0) {
                        const questions: any[] = [];
                        
                        questionElements.forEach((el: any) => {
                          const index = el.getAttribute('data-question-index');
                          const questionText = (document.querySelector(`[name="question_text_${index}"]`) as HTMLTextAreaElement)?.value;
                          const questionType = (document.querySelector(`[name="question_type_${index}"]`) as HTMLSelectElement)?.value;
                          const points = parseFloat((document.querySelector(`[name="points_${index}"]`) as HTMLInputElement)?.value || "10");
                          const order = parseInt((document.querySelector(`[name="order_${index}"]`) as HTMLInputElement)?.value || "0");
                          const isRequired = (document.querySelector(`[name="is_required_${index}"]`) as HTMLInputElement)?.checked || false;
                          const helpText = (document.querySelector(`[name="help_text_${index}"]`) as HTMLInputElement)?.value || "";
                          
                          let options: string[] = [];
                          let correctAnswer = "";
                          
                          if (questionType === "multiple_choice") {
                            const optionsText = (document.querySelector(`[name="options_${index}"]`) as HTMLTextAreaElement)?.value;
                            options = optionsText ? optionsText.split("\n").map(opt => opt.trim()).filter(opt => opt) : [];
                            correctAnswer = (document.querySelector(`[name="correct_answer_${index}"]`) as HTMLInputElement)?.value || "";
                          } else if (questionType === "true_false") {
                            options = ["Verdadero", "Falso"];
                            correctAnswer = (document.querySelector(`[name="correct_answer_${index}"]`) as HTMLSelectElement)?.value || "";
                          } else if (questionType === "short_answer") {
                            correctAnswer = (document.querySelector(`[name="correct_answer_${index}"]`) as HTMLInputElement)?.value || "";
                          }
                          // essay y rating no necesitan opciones ni respuesta correcta
                          
                          if (questionText) {
                            questions.push({
                              question_text: questionText,
                              question_type: questionType,
                              options: options,
                              correct_answer: correctAnswer || null,
                              points: points,
                              order: order,
                              is_required: isRequired,
                              help_text: helpText
                            });
                          }
                        });

                        console.log('Preguntas a crear:', questions);

                        if (questions.length > 0) {
                          const questionsResponse = await fetch(`${API_URL}/evaluations/questions/bulk_create/`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ template_id: createdTemplate.id, questions: questions }),
                          });
                          
                          if (!questionsResponse.ok) {
                            const error = await questionsResponse.json();
                            console.error('Error al crear preguntas:', error);
                          }
                        }
                      }
                    }

                    await fetchTemplates();
                    setShowModal(false);
                    setSelectedTemplate(null);
                    await showAlert("✅ " + (selectedTemplate ? "Actualizada" : `Creada con ${questionCount} preguntas`));
                  } else {
                    await showAlert("❌ Error: " + JSON.stringify(await response.json()));
                  }
                } catch (error) {
                  await showAlert("❌ Error al guardar");
                }
              }}>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Título *</label>
                    <input type="text" name="title" defaultValue={selectedTemplate?.title || ""} required className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Descripción</label>
                    <textarea name="description" defaultValue={selectedTemplate?.description || ""} rows={2} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Categoría *</label>
                    <select name="category" defaultValue={selectedTemplate?.category || "technical"} required className="w-full px-3 py-2 border rounded-lg">
                      {categories.map((cat) => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Duración (min) *</label>
                    <input type="number" name="duration_minutes" defaultValue={selectedTemplate?.duration_minutes || 60} required min="1" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Puntaje mínimo (%) *</label>
                    <input type="number" name="passing_score" defaultValue={selectedTemplate?.passing_score || 70} required min="0" max="100" step="0.01" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" name="is_active" id="is_active" defaultChecked={selectedTemplate?.is_active !== false} className="h-4 w-4" />
                    <label htmlFor="is_active" className="ml-2 text-sm">Activa</label>
                  </div>
                </div>

                {/* Sección de Preguntas - SIEMPRE VISIBLE */}
                <div className="mt-6 border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold">Preguntas</h4>
                    {!selectedTemplate ? (
                      <button type="button" onClick={addQuestion} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <i className="fas fa-plus mr-2"></i>Agregar Pregunta
                      </button>
                    ) : (
                      <button type="button" onClick={addQuestionToEdit} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <i className="fas fa-plus mr-2"></i>Agregar Nueva Pregunta
                      </button>
                    )}
                  </div>

                  {/* Mostrar preguntas existentes cuando se edita */}
                  {selectedTemplate && existingQuestions.length > 0 && (
                    <div className="space-y-4 mb-4">
                      {existingQuestions.map((question, index) => (
                        <div key={question.id} className="border border-gray-300 rounded-lg p-4 bg-white">
                          {!editingQuestions[question.id!] ? (
                            // Modo Vista
                            <>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{question.question_text}</p>
                                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                                    <span><i className="fas fa-list mr-1"></i>{questionTypes.find(t => t.value === question.question_type)?.label}</span>
                                    <span><i className="fas fa-star mr-1"></i>{question.points} pts</span>
                                    <span>
                                      {question.is_required ? (
                                        <span className="text-green-600"><i className="fas fa-check-circle mr-1"></i>Obligatoria</span>
                                      ) : (
                                        <span className="text-gray-500"><i className="fas fa-circle mr-1"></i>Opcional</span>
                                      )}
                                    </span>
                                  </div>
                                  {question.options && question.options.length > 0 && (
                                    <div className="mt-2 text-sm text-gray-600">
                                      <strong>Opciones:</strong> {question.options.join(", ")}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2 ml-4">
                                  <button
                                    type="button"
                                    onClick={() => toggleEditQuestion(question.id!)}
                                    className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                  >
                                    <i className="fas fa-edit mr-1"></i>Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteQuestion(question.id!)}
                                    className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            // Modo Edición
                            <div className="space-y-3">
                              <div className="flex justify-between items-center mb-3">
                                <h5 className="font-semibold text-gray-900">Editando Pregunta {index + 1}</h5>
                                <button
                                  type="button"
                                  onClick={() => toggleEditQuestion(question.id!)}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                              
                              <QuestionEditForm
                                question={question}
                                onSave={(data) => updateExistingQuestion(question.id!, data)}
                                onCancel={() => toggleEditQuestion(question.id!)}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedTemplate && existingQuestions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-question-circle text-4xl mb-3"></i>
                      <p>No hay preguntas en esta plantilla</p>
                    </div>
                  )}

                  {/* Contenedor para nuevas preguntas (solo en modo crear) */}
                  {!selectedTemplate && <div id="questions-container"></div>}
                </div>

                {/* Nuevas preguntas en modo edición */}
                  {selectedTemplate && newQuestionsInEdit.length > 0 && (
                    <div className="space-y-4 mb-4">
                      <h5 className="font-semibold text-gray-700 text-sm">Nuevas Preguntas (sin guardar)</h5>
                      {newQuestionsInEdit.map((question, index) => (
                        <div key={`new-${index}`} className="border border-green-300 bg-green-50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h5 className="font-semibold text-gray-900">
                              Nueva Pregunta {existingQuestions.length + index + 1}
                            </h5>
                            <button
                              type="button"
                              onClick={() => removeNewQuestion(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Pregunta *</label>
                              <textarea
                                rows={2}
                                value={question.question_text}
                                onChange={(e) => updateNewQuestion(index, 'question_text', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="Escribe la pregunta..."
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                                <select
                                  value={question.question_type}
                                  onChange={(e) => updateNewQuestion(index, 'question_type', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                  {questionTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Puntos *</label>
                                <input
                                  type="number"
                                  value={question.points}
                                  onChange={(e) => updateNewQuestion(index, 'points', parseFloat(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  min="0"
                                  step="0.5"
                                />
                              </div>
                              <div className="flex items-end">
                                <label className="flex items-center text-sm">
                                  <input
                                    type="checkbox"
                                    checked={question.is_required}
                                    onChange={(e) => updateNewQuestion(index, 'is_required', e.target.checked)}
                                    className="mr-2"
                                  />
                                  Obligatoria
                                </label>
                              </div>
                            </div>

                            {/* Opciones para multiple choice */}
                            {question.question_type === "multiple_choice" && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Opciones (una por línea) *
                                </label>
                                <textarea
                                  rows={4}
                                  value={question.options?.join('\n') || ''}
                                  onChange={(e) => {
                                    const options = e.target.value.split('\n').filter(o => o.trim());
                                    updateNewQuestion(index, 'options', options);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                                />
                              </div>
                            )}

                            {/* Respuesta correcta */}
                            {(question.question_type === "multiple_choice" || 
                              question.question_type === "true_false" || 
                              question.question_type === "short_answer") && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Respuesta Correcta
                                </label>
                                {question.question_type === "multiple_choice" ? (
                                  <select
                                    value={question.correct_answer || ''}
                                    onChange={(e) => updateNewQuestion(index, 'correct_answer', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  >
                                    <option value="">Selecciona una opción...</option>
                                    {question.options?.map((opt, i) => (
                                      <option key={i} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                ) : question.question_type === "true_false" ? (
                                  <select
                                    value={question.correct_answer || ''}
                                    onChange={(e) => updateNewQuestion(index, 'correct_answer', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  >
                                    <option value="">Selecciona...</option>
                                    <option value="Verdadero">Verdadero</option>
                                    <option value="Falso">Falso</option>
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={question.correct_answer || ''}
                                    onChange={(e) => updateNewQuestion(index, 'correct_answer', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="Respuesta correcta..."
                                  />
                                )}
                              </div>
                            )}

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Texto de Ayuda
                              </label>
                              <input
                                type="text"
                                value={question.help_text}
                                onChange={(e) => updateNewQuestion(index, 'help_text', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="Pista o ayuda para el candidato..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                  <button type="button" onClick={() => { setShowModal(false); setSelectedTemplate(null); }} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{selectedTemplate ? "Actualizar" : "Crear"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compartir */}
      {showShareModal && (
        <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                <i className="fas fa-share-alt text-purple-600 mr-2"></i>
                Compartir Evaluación
              </h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-gray-600 mb-4">
                  Comparte este enlace con cualquier persona para que pueda responder la evaluación sin necesidad de iniciar sesión.
                </p>
                
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enlace Público
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    >
                      <i className="fas fa-copy"></i>
                      Copiar
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <i className="fas fa-info-circle text-blue-600 mt-1"></i>
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Información importante:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>El enlace es público y puede ser usado por cualquier persona</li>
                      <li>Las respuestas se guardarán automáticamente en el sistema</li>
                      <li>Puedes compartir este enlace por email, WhatsApp o redes sociales</li>
                      <li>El enlace no expira y puede ser usado múltiples veces</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cerrar
                </button>
                <a
                  href={shareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <i className="fas fa-external-link-alt"></i>
                  Abrir en nueva pestaña
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Componente auxiliar para editar preguntas
  function QuestionEditForm({ question, onSave, onCancel }: {
    question: Question;
    onSave: (data: Partial<Question>) => void;
    onCancel: () => void;
  }) {
    const [formData, setFormData] = useState(question);

    const questionTypes = [
      { value: "multiple_choice", label: "Opción Múltiple" },
      { value: "true_false", label: "Verdadero/Falso" },
      { value: "short_answer", label: "Respuesta Corta" },
      { value: "essay", label: "Ensayo" },
      { value: "rating", label: "Calificación" }
    ];

    const handleSave = () => {
      onSave(formData);
    };

    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pregunta *</label>
          <textarea
            rows={2}
            value={formData.question_text}
            onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <select
              value={formData.question_type}
              onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {questionTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Puntos *</label>
            <input
              type="number"
              value={formData.points}
              onChange={(e) => setFormData({ ...formData, points: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              min="0"
              step="0.5"
              required
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={formData.is_required}
                onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                className="mr-2"
              />
              Obligatoria
            </label>
          </div>
        </div>

        {formData.question_type === "multiple_choice" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opciones (una por línea) *
            </label>
            <textarea
              rows={4}
              value={formData.options?.join('\n') || ''}
              onChange={(e) => {
                const options = e.target.value.split('\n').filter(o => o.trim());
                setFormData({ ...formData, options });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        )}

        {(formData.question_type === "multiple_choice" || 
          formData.question_type === "true_false" || 
          formData.question_type === "short_answer") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Respuesta Correcta
            </label>
            {formData.question_type === "multiple_choice" ? (
              <select
                value={formData.correct_answer || ''}
                onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Selecciona una opción...</option>
                {formData.options?.map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            ) : formData.question_type === "true_false" ? (
              <select
                value={formData.correct_answer || ''}
                onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Selecciona...</option>
                <option value="Verdadero">Verdadero</option>
                <option value="Falso">Falso</option>
              </select>
            ) : (
              <input
                type="text"
                value={formData.correct_answer || ''}
                onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Texto de Ayuda</label>
          <input
            type="text"
            value={formData.help_text}
            onChange={(e) => setFormData({ ...formData, help_text: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    );
  }
}
