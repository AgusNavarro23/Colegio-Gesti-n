"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UploadCloud, AlertTriangle, Database, Cpu } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export const DashboardInteligenteView = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<FileList | null>(null)
  const [resultados, setResultados] = useState<any[]>([])

  const handleUploadAndProcess = async () => {
    if (!files || files.length === 0) return toast({ title: "Sube al menos un PDF", variant: "destructive" })
    
    setLoading(true)
    const formData = new FormData()
    Array.from(files).forEach(file => formData.append("archivos", file))

    try {
      // 1. Enviar PDFs a FastAPI para análisis
      const resFastAPI = await fetch("http://localhost:8000/api/procesar-batch", {
        method: "POST",
        body: formData
      })
      const dataFastAPI = await resFastAPI.json()

      if (dataFastAPI.status === "success") {
        setResultados(dataFastAPI.data)
        
        // 2. Guardar en la tabla intermedia DeclaracionVerificar vía Next.js API
        await fetch("/api/verificaciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataFastAPI.data)
        })

        toast({ 
          title: "Análisis Completado", 
          description: `${dataFastAPI.total_procesados} archivos analizados y depositados en la bandeja de revisión.` 
        })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Fallo de conexión con el motor de IA." })
    } finally {
      setLoading(false)
    }
  }

  const alertas = resultados.filter(r => r.prioridad === 'ALTA').length

  return (
    <div className="flex-1 space-y-6 p-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">Tablero Inteligente</h2>
        <p className="text-muted-foreground">Depósito temporal de validaciones (Tabla: DeclaracionVerificar)</p>
      </div>

      <Card className="bg-slate-50 border-dashed border-2 border-slate-300">
        <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
          <UploadCloud className="h-10 w-10 text-slate-400" />
          <Input type="file" multiple accept=".pdf" onChange={(e) => setFiles(e.target.files)} className="max-w-md bg-white" />
          <Button onClick={handleUploadAndProcess} disabled={loading} className="bg-indigo-600">
            {loading ? <Cpu className="mr-2 h-4 w-4 animate-pulse" /> : <Cpu className="mr-2 h-4 w-4" />}
            {loading ? "Extrayendo y Validando..." : "Analizar Lote de PDFs"}
          </Button>
        </CardContent>
      </Card>

      {resultados.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
           <Card>
            <CardHeader><CardTitle className="text-sm">Depositados en Revisión</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{resultados.length}</div></CardContent>
          </Card>
          <Card className="border-l-4 border-red-500">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="text-red-500 w-4 h-4"/> Alertas Detectadas</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-red-600">{alertas}</div></CardContent>
          </Card>
        </div>
      )}

      {resultados.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Logs de Inconsistencias (Detalle)</CardTitle></CardHeader>
          <CardContent>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3">Escribano / Reg</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Motivo Detallado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((res, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-3 font-medium">{res.nombre_oficial} <br/><span className="text-xs text-slate-400">Reg: {res.nro_registro}</span></td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${res.prioridad === 'ALTA' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {res.prioridad}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 max-w-lg">
                          {/* El mensaje completo de la IA se muestra aquí */}
                          {res.motivos_riesgo.split(' | ').map((motivo: string, idx: number) => (
                            <div key={idx} className={res.prioridad === 'ALTA' ? "text-red-600 font-medium mb-1" : "text-green-600"}>
                              {motivo}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}