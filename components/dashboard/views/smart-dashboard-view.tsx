"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UploadCloud, AlertTriangle, Cpu, Eye, FileText, BadgeDollarSign, User, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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
      const resFastAPI = await fetch("http://localhost:8000/api/procesar-batch", {
        method: "POST",
        body: formData
      })
      const dataFastAPI = await resFastAPI.json()

      if (dataFastAPI.status === "success") {
        setResultados(dataFastAPI.data)
        
        // POST Opcional a tu API en Next.js para guardarlo en DeclaracionVerificar
        await fetch("/api/verificaciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataFastAPI.data)
        })

        toast({ 
          title: "Análisis Completado", 
          description: `${dataFastAPI.total_procesados} archivos enviados a la tabla de verificación.` 
        })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Fallo de conexión con el motor IA (FastAPI)." })
    } finally {
      setLoading(false)
    }
  }

  const alertas = resultados.filter(r => r.prioridad === 'ALTA').length
const formatearMoneda = (valor: number) => {
    if (valor === undefined || valor === null) return "0,00";
    return valor.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    });
  };
  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">Tablero Inteligente</h2>
        <p className="text-muted-foreground">Automatización y Depósito de Validaciones</p>
      </div>

      <Card className="border-dashed border-2 border-slate-300 bg-transparent shadow-none">
        <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
          <UploadCloud className="h-10 w-10 text-slate-400" />
          <Input type="file" multiple accept=".pdf" onChange={(e) => setFiles(e.target.files)} className="max-w-md bg-white cursor-pointer" />
          <Button onClick={handleUploadAndProcess} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ? <Cpu className="mr-2 h-4 w-4 animate-pulse" /> : <Cpu className="mr-2 h-4 w-4" />}
            {loading ? "Extrayendo y Validando..." : "Analizar Lote de PDFs"}
          </Button>
        </CardContent>
      </Card>

      {resultados.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
           <Card>
            <CardHeader><CardTitle className="text-sm text-slate-500 font-medium">Depositados en Revisión</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-slate-800">{resultados.length}</div></CardContent>
          </Card>
          <Card className="border-l-4 border-red-500">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2 text-slate-500 font-medium"><AlertTriangle className="text-red-500 w-4 h-4"/> Alertas Detectadas</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-red-600">{alertas}</div></CardContent>
          </Card>
        </div>
      )}

      {resultados.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader><CardTitle>Resultados del Procesamiento Batch</CardTitle></CardHeader>
          <CardContent>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="p-3 text-slate-500 font-semibold">Escribano / Reg</th>
                      <th className="p-3 text-slate-500 font-semibold">Estado</th>
                      <th className="p-3 text-slate-500 font-semibold">Motivo Principal</th>
                      <th className="p-3 text-slate-500 font-semibold text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((res, i) => (
                      <tr key={i} className="border-b hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-medium text-slate-700">
                          {res.nombre_oficial} <br/>
                          <span className="text-xs text-slate-400 font-normal">Reg: {res.nro_registro}</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${res.prioridad === 'ALTA' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {res.prioridad}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 max-w-md truncate">
                          {res.motivos_riesgo.split(' | ')[0]}
                          {res.motivos_riesgo.split(' | ').length > 1 && " (+ otros detalles)"}
                        </td>
                        <td className="p-3 text-center">
                          {/* MODAL DE DETALLES */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8">
                                <Eye className="w-4 h-4 mr-2 text-indigo-600" /> Ver Detalles
                              </Button>
                            </DialogTrigger>
                                <DialogContent className="sm:max-w-[95vw] lg:max-w-5xl w-full max-h-[90vh] overflow-y-auto bg-slate-50">                              
                                <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-xl text-slate-800 border-b pb-4">
                                  <FileText className="w-6 h-6 text-indigo-600" />
                                  Declaración Jurada - Detalle de Liquidación
                                </DialogTitle>
                              </DialogHeader>
                              
                              <div className="space-y-6 mt-2">
                                
                                {/* 1. CABECERA TIPO FORMULARIO */}
                                <div className="grid grid-cols-4 gap-4 bg-white p-4 rounded-md border shadow-sm text-sm">
                                  <div className="col-span-2">
                                    <p className="text-slate-500 font-semibold mb-1">Escribano Titular/Adjunto</p>
                                    <p className="font-bold text-slate-800 uppercase">{res.nombre_oficial}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500 font-semibold mb-1">Registro N°</p>
                                    <p className="font-bold text-slate-800">{res.nro_registro}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500 font-semibold mb-1">CUIT / DNI</p>
                                    <p className="font-bold text-slate-800">{res.cuit_escribano}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500 font-semibold mb-1">Fecha Acto</p>
                                    <p className="font-medium text-slate-700">{res.fecha_acto}</p>
                                  </div>
                                  <div className="col-span-3">
                                    <p className="text-slate-500 font-semibold mb-1">Archivo de Origen</p>
                                    <p className="font-medium text-indigo-600 truncate">{res.archivo_origen}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* 2. COLUMNA IZQUIERDA: DESGLOSE DE ACTOS */}
                                  <div className="space-y-4">
                                    <h4 className="font-bold text-slate-700 uppercase text-sm border-b-2 border-slate-200 pb-1">Naturaleza de los Actos</h4>
                                    
                                    <div className="bg-white rounded-md border shadow-sm p-3 space-y-3">
                                      {res.actos_resumen ? res.actos_resumen.split(' ; ').map((acto: string, idx: number) => {
                                        const partes = acto.split('|');
                                        if(partes.length === 3) {
                                          return (
                                            <div key={idx} className="flex justify-between items-start border-b last:border-0 pb-2 last:pb-0">
                                              <div className="flex gap-2">
                                                <span className="font-mono text-xs text-slate-500 mt-0.5">{partes[0]}</span>
                                                <span className="font-medium text-slate-700 text-sm uppercase leading-tight max-w-[200px]">{partes[1]}</span>
                                              </div>
                                              <span className="font-bold text-slate-800 text-sm">${parseFloat(partes[2]).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                            </div>
                                          )
                                        }
                                        return <div key={idx} className="text-sm">{acto}</div>;
                                      }) : <p className="text-sm text-slate-400">No se detectaron actos.</p>}
                                    </div>

                                    {/* Diagnóstico IA Integrado */}
                                    <div className={`p-4 rounded-md border ${res.prioridad === 'ALTA' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                      <h4 className={`font-bold mb-2 flex items-center gap-2 text-sm uppercase ${res.prioridad === 'ALTA' ? 'text-red-700' : 'text-emerald-700'}`}>
                                        {res.prioridad === 'ALTA' ? <AlertTriangle className="w-4 h-4"/> : <CheckCircle className="w-4 h-4"/>} 
                                        Diagnóstico del Sistema
                                      </h4>
                                      <ul className="space-y-1 text-sm">
                                        {res.motivos_riesgo.split(' | ').map((motivo: string, idx: number) => (
                                          <li key={idx} className={`${res.prioridad === 'ALTA' ? 'text-red-800 font-medium' : 'text-emerald-800'}`}>
                                            • {motivo}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                                                        {/* Comparativa Arancel TIP */}
                                    <div className="mt-4 bg-amber-50 p-4 rounded-md border border-amber-200">
                                      <h4 className="font-bold text-amber-800 text-sm uppercase mb-3 flex items-center gap-2">
                                        <BadgeDollarSign className="w-4 h-4" /> Control de Arancel TIP
                                      </h4>
                                      <div className="flex justify-between items-center border-b border-amber-200 pb-2 mb-2">
                                        <span className="text-amber-700 text-sm">Declarado en PDF:</span>
                                        <span className="font-bold text-amber-900">${res.arancel_tip?.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-amber-700 text-sm">Cálculo de Sistema:</span>
                                        <span className="font-bold text-amber-900">${res.arancel_calculado?.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 3. COLUMNA DERECHA: LIQUIDACIÓN DEL ESCRIBANO (Formato Original) */}
                                  <div>
                                    <h4 className="font-bold text-slate-700 uppercase text-sm border-b-2 border-slate-200 pb-1 mb-4">Liquidación del Escribano</h4>
                                    
                                    <div className="bg-white rounded-md border shadow-sm text-sm">
                                      {/* Rubro A */}
                                      <div className="flex justify-between items-center p-3 border-b bg-slate-50/50">
                                        <span className="font-semibold text-slate-600">Total Rubro "A" - D.G.R.</span>
                                        <span className="font-medium">${formatearMoneda(res.rubro_a)}</span>
                                      </div>
                                      
                                      {/* Rubro B */}
                                      <div className="flex justify-between items-center p-3 border-b">
                                        <span className="font-semibold text-slate-600">Total Rubro "B" - Ley 3221</span>
                                        <span className="font-medium">${formatearMoneda(res.rubro_b)}</span>
                                      </div>

                                      {/* Rubro C */}
                                      <div className="flex justify-between items-center p-3 border-b bg-slate-50/50">
                                        <span className="font-semibold text-slate-600">Rubro "C" - Servicios Sociales</span>
                                        <span className="font-medium">${formatearMoneda(res.rubro_c)}</span>
                                      </div>

                                      {/* Rubro D */}
                                      <div className="flex justify-between items-center p-3 border-b">
                                        <span className="font-semibold text-slate-600">Rubro "D" - Fondo Cultural</span>
                                        <span className="font-medium">${formatearMoneda(res.rubro_d)}</span>
                                      </div>

                                      {/* Total General */}
                                      <div className="flex justify-between items-center p-4 bg-slate-800 text-white rounded-b-md">
                                        <span className="font-bold text-base uppercase">Total General a Depositar</span>
                                        <span className="font-bold text-lg">${formatearMoneda(res.total_general)}</span>
                                      </div>
                                    </div>

                                  </div>
                                </div>

                              </div>
                            </DialogContent>
                          </Dialog>
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

// Icono faltante
function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}