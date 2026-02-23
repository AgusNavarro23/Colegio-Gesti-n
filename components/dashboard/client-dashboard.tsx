'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Download, CreditCard, Loader2, Scale, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Request {
  id: string;
  title: string;
  description: string;
  requestType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  rejectionReason?: string;
  transactionId?: string;
  createdAt: string;
  // Nuevos campos
  deedNumber?: string;
  year?: string;
  notary?: string;
  parties?: string;
  amount?: number;
  pdfValidated: boolean;
}

export function ClientDashboard() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState({
    requestType: 'Copia de Entrada',
    deedNumber: '',
    year: new Date().getFullYear().toString(),
    notary: '',
    parties: '',
  });

  useEffect(() => {
    fetchRequests();

    // Detectar retorno de MercadoPago (Si implementaste MP real)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'success') {
        toast({ title: 'Pago Exitoso', description: 'El pago se procesó correctamente.' });
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchRequests = async () => {
    try {
      const token = useAuthStore.getState().token;
      // Usamos el endpoint GET que devuelve las solicitudes del usuario
      const response = await fetch('/api/requests', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al cargar solicitudes');

      const data = await response.json();
      setRequests(data);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar las solicitudes', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = useAuthStore.getState().token;
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Error al crear solicitud');

      toast({ title: 'Solicitud creada', description: 'Tu solicitud ha sido enviada correctamente' });

      setFormData({ 
        requestType: 'Copia de Entrada',
        deedNumber: '',
        year: new Date().getFullYear().toString(),
        notary: '',
        parties: '',
      });
      setIsDialogOpen(false);
      fetchRequests();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo crear la solicitud', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePay = async (requestId: string) => {
    setIsPaying(true);
    try {
        const token = useAuthStore.getState().token;
        // Llamada a API que devuelve URL de pago o simulación
        const response = await fetch(`/api/requests/${requestId}/pay`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Error al iniciar pago');

        const data = await response.json();

        if (data.url === 'SIMULATED_SUCCESS') {
            toast({ title: 'Pago Simulado Exitoso', description: 'Tu trámite ha sido pagado.' });
            fetchRequests();
        } else if (data.url) {
            // Redirigir a MercadoPago
            window.location.href = data.url;
        }
    } catch (error) {
        toast({ title: 'Error', description: 'No se pudo procesar el pago', variant: 'destructive' });
    } finally {
        setIsPaying(false);
    }
  };

  const handleDownloadPDF = async (request: Request) => {
    try {
      const token = useAuthStore.getState().token;
      const response = await fetch(`/api/requests/${request.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al generar PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tramite_${request.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({ title: 'PDF descargado', description: 'El documento se ha descargado correctamente' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo generar el PDF', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      PENDING: { variant: 'outline', icon: Clock, label: 'Pendiente', color: 'text-yellow-600', className: 'bg-yellow-50 border-yellow-200' },
      APPROVED: { variant: 'outline', icon: CheckCircle2, label: 'Aprobado', color: 'text-green-600', className: 'bg-green-50 border-green-200' },
      REJECTED: { variant: 'destructive', icon: XCircle, label: 'Rechazado', color: 'text-white', className: '' },
      PAID: { variant: 'default', icon: CheckCircle2, label: 'Pagado', color: 'text-primary-foreground', className: 'bg-primary' },
    };

    const config = variants[status] || variants.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="w-3 h-3" />
        <span className={config.color}>{config.label}</span>
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary">
                <Scale className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Notaría Digital</h1>
                <p className="text-xs text-gray-600">Portal de Clientes</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'Cliente'}</p>
                <p className="text-xs text-gray-600">{user?.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-red-50 hover:text-red-600 transition-colors"
                onClick={() => {
                  useAuthStore.getState().logout();
                  window.location.href = '/';
                }}
              >
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Solicitudes</CardTitle>
              <FileText className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{requests.length}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pendientes</CardTitle>
              <Clock className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{requests.filter(r => r.status === 'PENDING').length}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completados</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{requests.filter(r => r.status === 'PAID').length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Requests Section */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Mis Solicitudes</CardTitle>
                <CardDescription>Gestiona y realiza el seguimiento de tus trámites notariales</CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-md transition-all">
                    <Plus className="w-4 h-4" />
                    Nueva Solicitud
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Solicitud</DialogTitle>
                    <DialogDescription>
                      Completa los datos de la escritura para iniciar el trámite.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitRequest}>
                    <div className="space-y-4 pt-4">
                      
                      {/* Formulario */}
                      <div className="space-y-2">
                        <Label htmlFor="requestType">Tipo de Solicitud</Label>
                        <Select
                          value={formData.requestType}
                          onValueChange={(value) => setFormData({ ...formData, requestType: value })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Copia de Entrada">Copia de Entrada</SelectItem>
                            <SelectItem value="Copia Digital">Copia Digital</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="deedNumber">N° Escritura</Label>
                          <Input
                            id="deedNumber"
                            placeholder="Ej: 1234"
                            value={formData.deedNumber}
                            onChange={(e) => setFormData({ ...formData, deedNumber: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="year">Año</Label>
                          <Input
                            id="year"
                            placeholder="2024"
                            type="number"
                            value={formData.year}
                            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notary">Escribano</Label>
                        <Input
                          id="notary"
                          placeholder="Nombre del Escribano"
                          value={formData.notary}
                          onChange={(e) => setFormData({ ...formData, notary: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="parties">Partes Intervinientes</Label>
                        <Input
                          id="parties"
                          placeholder="Ej: Juan Pérez vs María López"
                          value={formData.parties}
                          onChange={(e) => setFormData({ ...formData, parties: e.target.value })}
                          required
                        />
                      </div>

                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                          </>
                        ) : 'Enviar Solicitud'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No tienes solicitudes aún</p>
                <Button onClick={() => setIsDialogOpen(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Crear Primera Solicitud
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trámite</TableHead>
                      <TableHead>Detalles</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium">
                          <div>
                            <p className="font-semibold">
                                {request.deedNumber ? `Escritura ${request.deedNumber} / ${request.year}` : request.title}
                            </p>
                            {request.rejectionReason && (
                              <p className="text-xs text-red-600 mt-1">Motivo: {request.rejectionReason}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                           <div className="text-sm">
                             <p className="font-medium">{request.notary || "No especificado"}</p>
                             <p className="text-xs text-gray-500 truncate max-w-[200px]">{request.parties || request.description}</p>
                           </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline">{request.requestType}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {new Date(request.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            
                            {/* BOTÓN PAGAR (Si está aprobado) */}
                            {request.status === 'APPROVED' && (
                              <Button
                                size="sm"
                                onClick={() => handlePay(request.id)}
                                disabled={isPaying}
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all gap-1"
                              >
                                <CreditCard className="w-3 h-3" />
                                {isPaying ? 'Procesando...' : `Pagar $${request.amount}`}
                              </Button>
                            )}

                            {/* MENSAJE DE ESPERA (Pagado pero no validado) */}
                            {request.status === 'PAID' && !request.pdfValidated && (
                                <Badge variant="outline" className="border-orange-300 text-orange-600 bg-orange-50 h-9 px-3">
                                    <Clock className="w-3 h-3 mr-2 animate-pulse" />
                                    Validando PDF...
                                </Badge>
                            )}

                            {/* BOTÓN DESCARGAR (Pagado Y Validado) */}
                            {request.status === 'PAID' && request.pdfValidated && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadPDF(request)}
                                className="border-green-600 text-green-700 hover:bg-green-50 transition-colors gap-1"
                              >
                                <Download className="w-3 h-3" /> PDF
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
          <p>© 2024 Notaría Digital. Sistema de Gestión de Trámites Notariales</p>
        </div>
      </footer>
    </div>
  );
}