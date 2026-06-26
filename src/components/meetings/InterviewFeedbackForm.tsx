'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '@/context/ModalContext';
import { feedbackApi } from '@/lib/api-meetings';
import type { Meeting, FeedbackFormData, FeedbackRecommendation, InterviewFeedback } from '@/types/meetings';

interface Props {
  meeting: Meeting;
  existingFeedback?: InterviewFeedback;
  onSave: (feedback: InterviewFeedback) => void;
  onClose: () => void;
}

const ScoreInput = ({
  label, value, onChange,
}: { label: string; value: number | undefined; onChange: (v: number) => void }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-8 h-8 rounded text-xs font-bold transition-all ${
            value === n
              ? 'bg-blue-600 text-white shadow-md scale-110'
              : value && n <= value
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  </div>
);

const RECOMMENDATIONS: { value: FeedbackRecommendation; label: string; color: string; icon: string }[] = [
  { value: 'advance', label: 'Avanzar', color: 'green', icon: 'fa-thumbs-up' },
  { value: 'hold', label: 'En revisión', color: 'yellow', icon: 'fa-pause-circle' },
  { value: 'reject', label: 'No continuar', color: 'red', icon: 'fa-thumbs-down' },
];

export default function InterviewFeedbackForm({ meeting, existingFeedback, onSave, onClose }: Props) {
  const { showError } = useModal();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FeedbackFormData>({
    meeting: meeting.id,
    overall_rating: existingFeedback?.overall_rating || 0,
    technical_score: existingFeedback?.technical_score,
    soft_skills_score: existingFeedback?.soft_skills_score,
    communication_score: existingFeedback?.communication_score,
    recommendation: existingFeedback?.recommendation || 'hold',
    strengths: existingFeedback?.strengths || '',
    weaknesses: existingFeedback?.weaknesses || '',
    notes: existingFeedback?.notes || '',
  });

  const set = (key: keyof FeedbackFormData, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.overall_rating) { await showError('La calificación general es requerida.'); return; }
    if (!form.notes.trim()) { await showError('Las notas detalladas son requeridas.'); return; }

    setLoading(true);
    try {
      const result = existingFeedback
        ? await feedbackApi.update(existingFeedback.id, form)
        : await feedbackApi.create(form);
      onSave(result);
    } catch (err: any) {
      await showError(err?.data?.detail || 'Error al guardar el feedback.');
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl">
          <div className="text-white">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <i className="fas fa-clipboard-check"></i>
              Feedback de Entrevista
            </h2>
            <p className="text-xs text-emerald-100 mt-0.5">{meeting.candidate_name} — {meeting.title}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Calificación general */}
          <ScoreInput
            label={`Calificación General (1-10) ${!form.overall_rating ? '— selecciona una puntuación' : `— ${form.overall_rating}/10`}`}
            value={form.overall_rating || undefined}
            onChange={v => set('overall_rating', v)}
          />

          {/* Scores específicos */}
          <div className="grid grid-cols-1 gap-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dimensiones (opcional)</p>
            <ScoreInput
              label="Habilidades Técnicas"
              value={form.technical_score}
              onChange={v => set('technical_score', v)}
            />
            <ScoreInput
              label="Habilidades Blandas"
              value={form.soft_skills_score}
              onChange={v => set('soft_skills_score', v)}
            />
            <ScoreInput
              label="Comunicación"
              value={form.communication_score}
              onChange={v => set('communication_score', v)}
            />
          </div>

          {/* Recomendación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Recomendación</label>
            <div className="grid grid-cols-3 gap-2">
              {RECOMMENDATIONS.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set('recommendation', r.value)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium flex flex-col items-center gap-1 transition-all ${
                    form.recommendation === r.value
                      ? r.color === 'green'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : r.color === 'yellow'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <i className={`fas ${r.icon} text-lg`}></i>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fortalezas y áreas de mejora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <i className="fas fa-star text-yellow-400 mr-1"></i> Fortalezas
              </label>
              <textarea
                rows={3}
                value={form.strengths}
                onChange={e => set('strengths', e.target.value)}
                placeholder="Puntos destacados del candidato..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <i className="fas fa-exclamation-triangle text-orange-400 mr-1"></i> Áreas de mejora
              </label>
              <textarea
                rows={3}
                value={form.weaknesses}
                onChange={e => set('weaknesses', e.target.value)}
                placeholder="Aspectos a desarrollar..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Notas detalladas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas detalladas <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Describe cómo fue la entrevista, respuestas relevantes, observaciones generales..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
              ) : (
                <><i className="fas fa-check"></i> Guardar feedback</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}
