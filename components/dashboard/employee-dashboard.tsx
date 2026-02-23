'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input'; // Importamos Input
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Scale, FileText, CheckCircle2, XCircle, Clock, Loader2, LogOut, DollarSign, FileCheck } from 'lucide-react';

interface Request {
  id: string;
  title: string;
  description: string;
  requestType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  rejectionReason?: string;
  user: {
    name: string | null;
    email: string;
  };
  createdAt: string;
  // Nuevos campos
  amount?: number;
  pdfValidated: boolean;
}

export function EmployeeDashboard() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Estados para acciones
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  
  // Rechazo
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  
  // Aprobación (Monto)
  const [approveAmount, setApproveAmount] = useState('');
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = useAuthStore.getState().token;
      const response = await fetch('/api/requests/all', {
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

  // 1. Abrir dialogo de aprobación
  const openApproveDialog = (request: Request) => {
    setSelectedRequest(request);
    setApproveAmount('');
    setIsApproveDialogOpen(true);
  };

  // 2. Confirmar aprobación con monto
  const handleApprove = async () => {
    if (!selectedRequest || !approveAmount) return;
    setIsProcessing(true);

    try {
      const token = useAuthStore.getState().token;
      const response = await fetch(`/api/requests/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: parseFloat(approveAmount) }), // Enviamos el monto
      });

      if (!response.ok) throw new Error('Error al aprobar solicitud');

      toast({ title: 'Solicitud aprobada', description: `Monto asignado: $${approveAmount}` });
      
      setIsApproveDialogOpen(false);
      fetchRequests();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo aprobar la solicitud', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      setSelectedRequest(null);
    }
  };

  const openRejectDialog = (request: Request) => {
    setSelectedRequest(request);
    setRejectReason('');
    setIsRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) return;

    setIsProcessing(true);
    try {
      const token = useAuthStore.getState().token;
      const response = await fetch(`/api/requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (!response.ok) throw new Error('Error al rechazar solicitud');

      toast({ title: 'Solicitud rechazada', description: 'La solicitud ha sido rechazada correctamente' });

      setIsRejectDialogOpen(false);
      fetchRequests();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo rechazar la solicitud', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      setSelectedRequest(null);
    }
  };

  // 3. Función para Validar PDF
  const handleValidatePDF = async (request: Request) => {
    setIsProcessing(true);
    try {
      const token = useAuthStore.getState().token;
      const response = await fetch(`/api/requests/${request.id}/validate-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al validar');

      toast({ title: 'PDF Validado', description: 'El cliente ya puede descargar el documento.' });
      fetchRequests();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo validar el PDF', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string, validated: boolean) => {
    const variants: Record<string, any> = {
      PENDING: { variant: 'outline', icon: Clock, label: 'Pendiente', color: 'text-yellow-600', className: 'bg-yellow-50 border-yellow-200' },
      APPROVED: { variant: 'outline', icon: DollarSign, label: 'Aprobado / Impago', color: 'text-blue-600', className: 'bg-blue-50 border-blue-200' },
      REJECTED: { variant: 'destructive', icon: XCircle, label: 'Rechazado', color: 'text-white', className: '' },
      PAID: { variant: 'default', icon: CheckCircle2, label: 'Pagado', color: 'text-primary-foreground', className: 'bg-green-600' },
    };

    // Caso especial: Pagado pero falta validar
    if (status === 'PAID' && !validated) {
        return (
            <Badge variant="outline" className="flex items-center gap-1 bg-orange-50 border-orange-200 text-orange-700">
                <Clock className="w-3 h-3" />
                <span>Pago / Validar PDF</span>
            </Badge>
        );
    }

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
                <p className="text-xs text-gray-600">Panel de Empleados</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'Empleado'}</p>
                <p className="text-xs text-gray-600">{user?.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                onClick={() => {
                  useAuthStore.getState().logout();
                  window.location.href = '/';
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
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
              <CardTitle className="text-sm font-medium text-gray-600">Aprobados</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{requests.filter(r => r.status === 'APPROVED').length}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Rechazados</CardTitle>
              <XCircle className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{requests.filter(r => r.status === 'REJECTED').length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Requests Section */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Bandeja de Solicitudes</CardTitle>
            <CardDescription>
              Revisa, aprueba o rechaza las solicitudes de trámites notariales
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No hay solicitudes pendientes</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trámite</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <div>
                            <p className="font-semibold">{request.title}</p>
                            <p className="text-sm text-gray-600 line-clamp-1">{request.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                           <Badge variant="secondary">{request.requestType}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.user.name || 'Sin nombre'}</p>
                            <p className="text-xs text-gray-600">{request.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                            {request.amount ? `$${request.amount}` : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status, request.pdfValidated)}</TableCell>
                        <TableCell>
                          {new Date(request.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            
                            {/* BOTONES PENDIENTE */}
                            {request.status === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => openApproveDialog(request)}
                                  disabled={isProcessing}
                                  className="bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md transition-all gap-1"
                                >
                                  <DollarSign className="w-3 h-3" /> Aprobar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => openRejectDialog(request)}
                                  disabled={isProcessing}
                                  className="shadow-sm hover:shadow-md transition-all gap-1"
                                >
                                  <XCircle className="w-3 h-3" /> Rechazar
                                </Button>
                              </>
                            )}

                            {/* BOTÓN VALIDAR PDF */}
                            {request.status === 'PAID' && !request.pdfValidated && (
                                <Button
                                    size="sm"
                                    onClick={() => handleValidatePDF(request)}
                                    disabled={isProcessing}
                                    className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm hover:shadow-md transition-all gap-1"
                                >
                                    <FileCheck className="w-3 h-3" /> Validar PDF
                                </Button>
                            )}

                             {/* ESTADO FINAL */}
                            {request.status === 'PAID' && request.pdfValidated && (
                                <span className="text-xs font-bold text-green-600 flex items-center">
                                    <CheckCircle2 className="w-3 h-3 mr-1"/> Listo
                                </span>
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

      {/* Approve Dialog (Con Monto) */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar y Cotizar Solicitud</DialogTitle>
            <DialogDescription>
              Indica el monto que el cliente debe abonar para este trámite.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  className="pl-9"
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)} disabled={isProcessing}>
                    Cancelar
                </Button>
                <Button onClick={handleApprove} disabled={!approveAmount || isProcessing} className="bg-green-600 hover:bg-green-700">
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar'}
                </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud</DialogTitle>
            <DialogDescription>
              Ingresa el motivo por el cual se rechaza esta solicitud
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo de Rechazo</Label>
              <Textarea
                id="reason"
                placeholder="Describe el motivo..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} disabled={isProcessing}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Rechazar Solicitud'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
          <p>© 2024 Notaría Digital. Sistema de Gestión de Trámites Notariales</p>
        </div>
      </footer>
    </div>
  );
}