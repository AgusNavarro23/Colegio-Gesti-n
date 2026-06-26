"use client"

import { useState, useCallback, useRef } from "react"
import { useAuthStore } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Swal from 'sweetalert2'
import {
  UploadCloud, Cpu, Trash2, X, FileText, CheckCircle2
} from "lucide-react"
import { ProgressModal } from "@/components/ui/progress-modal"

type StageStatus = 'pending' | 'in-progress' | 'completed';

interface Stage {
  label: string;
  status: StageStatus;
}

export const DashboardInteligenteView = () => {
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showProgress, setShowProgress] = useState(false)
  const [stages, setStages] = useState<Stage[]>([
    { label: 'Subiendo archivos al motor...', status: 'pending' },
    { label: 'Extrayendo datos de los PDFs...', status: 'pending' },
    { label: 'Validando declaraciones...', status: 'pending' },
    { label: 'Guardando en base de datos...', status: 'pending' },
  ])
  const [currentStage, setCurrentStage] = useState(-1)

  const updateStage = (index: number, status: StageStatus) => {
    setStages(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], status };
      }
      return updated;
    });
    setCurrentStage(index);
  };

  const validateFiles = (fileList: File[]) => {
    const validFiles: File[] = []
    const invalidFiles: string[] = []

    fileList.forEach(file => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        invalidFiles.push(file.name)
      } else if (file.size > 50 * 1024 * 1024) {
        invalidFiles.push(`${file.name} (supera 50MB)`)
      } else {
        validFiles.push(file)
      }
    })

    if (invalidFiles.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivos no validos',
        html: `Los siguientes archivos fueron rechazados:<br><ul class="text-left mt-2">${invalidFiles.map(f => `<li>${f}</li>`).join('')}</ul>`,
        confirmButtonText: 'Aceptar',
        allowOutsideClick: false,
        allowEscapeKey: false,
      })
    }

    return validFiles
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    const validFiles = validateFiles(droppedFiles)
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles])
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      const validFiles = validateFiles(selectedFiles)
      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles])
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUploadAndProcess = async () => {
    if (files.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin archivos',
        text: 'Sube al menos un PDF para procesar.',
        confirmButtonText: 'Aceptar',
        allowOutsideClick: false,
        allowEscapeKey: false,
      })
      return
    }

    const hoy = new Date().toISOString().split('T')[0]

    const { value: fechaPago } = await Swal.fire({
      title: 'Fecha de Pago',
      html: `
        <div class="text-left">
          <label class="block text-sm font-medium text-gray-700 mb-1">Selecciona la fecha de pago para las declaraciones aprobadas automaticamente:</label>
          <input id="fecha-pago" type="date" value="${hoy}" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Procesar',
      cancelButtonText: 'Cancelar',
      allowOutsideClick: false,
      allowEscapeKey: false,
      preConfirm: () => {
        const input = (document.getElementById('fecha-pago') as HTMLInputElement)
        if (!input || !input.value) {
          Swal.showValidationMessage('Debes seleccionar una fecha')
          return false
        }
        return input.value
      }
    })

    if (!fechaPago) return

    setLoading(true)
    setShowProgress(true)
    setStages([
      { label: 'Subiendo archivos al motor...', status: 'pending' },
      { label: `Extrayendo datos de ${files.length} PDFs...`, status: 'pending' },
      { label: 'Validando declaraciones...', status: 'pending' },
      { label: 'Guardando en base de datos...', status: 'pending' },
    ])
    setCurrentStage(-1)

    try {
      // Stage 1a: Upload PDFs to Next.js for persistent storage
      updateStage(0, 'in-progress')
      const pdfUrls: Record<string, string> = {}
      for (const file of files) {
        const pdfFormData = new FormData()
        pdfFormData.append('file', file)
        const uploadRes = await fetch('/api/upload-pdf', {
          method: 'POST',
          body: pdfFormData,
        })
        if (uploadRes.ok) {
          const { url } = await uploadRes.json()
          pdfUrls[file.name] = url
        }
      }

      // Stage 1b: Upload to FastAPI for processing
      const token = useAuthStore.getState().token
      const formData = new FormData()
      files.forEach(file => formData.append("archivos", file))

      const resFastAPI = await fetch("http://localhost:8000/api/procesar-batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })

      if (!resFastAPI.ok) {
        const errorData = await resFastAPI.json()
        throw new Error(errorData.detail || 'Error en el procesamiento')
      }

      const dataFastAPI = await resFastAPI.json()

      if (dataFastAPI.status === "success") {
        // Stage 1 complete, Stage 2 in progress
        updateStage(0, 'completed')
        updateStage(1, 'in-progress')

        // Simulate extraction time for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500))

        // Stage 2 complete, Stage 3 in progress
        updateStage(1, 'completed')
        updateStage(2, 'in-progress')

        // Validation is instant (done by FastAPI)
        await new Promise(resolve => setTimeout(resolve, 300))

        // Stage 3 complete, Stage 4 in progress
        updateStage(2, 'completed')
        updateStage(3, 'in-progress')

        // Attach PDF paths to each item
        const itemsWithPdf = (dataFastAPI.data || []).map((item: any) => ({
          ...item,
          pdfPath: pdfUrls[item.archivo_origen] || pdfUrls[item.archivoOrigen] || '',
        }))

        // Save to database
        const resNextJS = await fetch("/api/verificaciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: itemsWithPdf,
            fecha_pago: fechaPago
          })
        })

        if (!resNextJS.ok) {
          const errorData = await resNextJS.json()
          throw new Error(errorData.detail || errorData.error || 'Error al guardar en la base de datos')
        }

        // All stages complete
        updateStage(3, 'completed')

        const autoAprobadas = dataFastAPI.data.filter((r: any) => r.estado === 'APROBADA_AUTO').length
        const pendientes = dataFastAPI.data.filter((r: any) => r.estado === 'PENDIENTE_REVISION').length

        // Update stages to show summary
        setStages(prev => [
          ...prev,
          {
            label: `${dataFastAPI.total_procesados} procesados | ${autoAprobadas} auto-aprobadas | ${pendientes} pendientes`,
            status: 'completed'
          }
        ])
        setCurrentStage(4)
      }
    } catch (error) {
      setStages(prev => prev.map(s => ({
        ...s,
        status: s.status === 'in-progress' ? 'pending' : s.status
      })))
      setCurrentStage(-1)

      Swal.fire({
        icon: 'error',
        title: 'Error de procesamiento',
        text: error instanceof Error ? error.message : 'No se pudo completar el procesamiento.',
        confirmButtonText: 'Aceptar',
        allowOutsideClick: false,
        allowEscapeKey: false,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCloseProgress = () => {
    setShowProgress(false)
    setFiles([])
    setStages([
      { label: 'Subiendo archivos al motor...', status: 'pending' },
      { label: 'Extrayendo datos de los PDFs...', status: 'pending' },
      { label: 'Validando declaraciones...', status: 'pending' },
      { label: 'Guardando en base de datos...', status: 'pending' },
    ])
    setCurrentStage(-1)
  }

  return (
    <div className="w-full space-y-6">
      {/* DRAG & DROP ZONE */}
      <Card className={`border-dashed border-2 transition-all duration-200 ${isDragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-amber-200 bg-white/80'} shadow-sm`}>
        <CardContent
          className="flex flex-col items-center justify-center p-8 space-y-4 cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className={`h-12 w-12 transition-colors ${isDragOver ? 'text-primary' : 'text-primary'}`} />
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-700">
              {isDragOver ? 'Suelta los archivos aqui' : 'Arrastra y suelta archivos PDF aqui'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              o haz clic para seleccionar archivos. Solo se aceptan archivos PDF (max. 50MB).
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* FILE LIST */}
      {files.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600 font-medium flex items-center justify-between">
              <span>Archivos seleccionados ({files.length})</span>
              <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="text-red-500 hover:text-red-700 hover:bg-red-50" disabled={loading}>
                <Trash2 className="w-4 h-4 mr-1" /> Limpiar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); removeFile(i); }} disabled={loading}>
                    <X className="w-3 h-3 text-gray-400" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button onClick={handleUploadAndProcess} disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white">
                {loading ? <Cpu className="mr-2 h-4 w-4 animate-pulse" /> : <Cpu className="mr-2 h-4 w-4" />}
                {loading ? "Procesando..." : `Analizar ${files.length} PDF${files.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PROGRESS MODAL */}
      <ProgressModal
        isOpen={showProgress}
        stages={stages}
        currentStage={currentStage}
        totalFiles={files.length}
        onClose={handleCloseProgress}
      />
    </div>
  )
}
