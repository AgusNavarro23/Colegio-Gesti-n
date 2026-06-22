'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, Circle, X } from 'lucide-react';

interface ProgressStage {
  label: string;
  status: 'pending' | 'in-progress' | 'completed';
}

interface ProgressModalProps {
  isOpen: boolean;
  stages: ProgressStage[];
  currentStage: number;
  totalFiles: number;
  onClose: () => void;
}

export function ProgressModal({ isOpen, stages, currentStage, totalFiles, onClose }: ProgressModalProps) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setIsComplete(false);
      return;
    }

    const completedCount = stages.filter(s => s.status === 'completed').length;

    if (completedCount === stages.length && stages.length > 0) {
      setProgress(100);
      setIsComplete(true);
      return;
    }

    setIsComplete(false);
    const progressPercent = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;
    setProgress(progressPercent);
  }, [stages, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-amber-600 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Loader2 className={`w-5 h-5 ${isComplete ? 'hidden' : 'animate-spin'}`} />
            {isComplete ? 'Procesamiento Completado' : 'Procesamiento de Declaraciones'}
          </h3>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Stages */}
          <div className="space-y-3">
            {stages.map((stage, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {stage.status === 'completed' && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  {stage.status === 'in-progress' && (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  )}
                  {stage.status === 'pending' && (
                    <Circle className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <span className={`text-sm ${
                  stage.status === 'completed' ? 'text-green-600 font-medium' :
                  stage.status === 'in-progress' ? 'text-primary font-medium' :
                  'text-gray-400'
                }`}>
                  {stage.label}
                </span>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progreso general</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-amber-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* File counter */}
          {totalFiles > 0 && currentStage < stages.length && (
            <p className="text-xs text-gray-400 text-center">
              Procesando {totalFiles} archivo{totalFiles > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          {isComplete ? (
            <button
              onClick={onClose}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Cerrar
            </button>
          ) : (
            <p className="text-xs text-gray-400 text-center">
              Por favor no cierres esta ventana durante el procesamiento
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
