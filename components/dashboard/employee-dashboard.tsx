// components/dashboard/employee-dashboard.tsx
'use client';

import { useState } from 'react';
import { DashboardLayout } from './dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Edit, Trash2, Users, BookOpen, DollarSign } from 'lucide-react';

type ViewType = 'escribanos' | 'registros' | 'aranceles';

export function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<ViewType>('escribanos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // MOCK DATA (Reemplazar con llamadas a la API luego)
  const [escribanos] = useState([
    { id: '1', nombre: 'Juan Pérez', matricula: '1234', estado: 'Activo' },
    { id: '2', nombre: 'María Gómez', matricula: '5678', estado: 'Inactivo' },
  ]);

  const [registros] = useState([
    { id: '1', numero: 'Reg-001', titular: 'Dr. López', direccion: 'Av. Siempre Viva 123' },
  ]);

  const [aranceles] = useState([
    { id: '1', tramite: 'Certificación de Firma', monto: 15000 },
    { id: '2', tramite: 'Poder General', monto: 45000 },
  ]);

  // Configuración del Sidebar


  // Manejo de Modales
  const handleOpenModal = (item: any = null) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const titles = {
    escribanos: 'Gestión de Escribanos',
    registros: 'Gestión de Registros',
    aranceles: 'Gestión de Aranceles'
  };

  // Renderizado dinámico de la tabla según la pestaña activa
  const renderTableContent = () => {
    switch (activeTab) {
      case 'escribanos':
        const filteredEscribanos = escribanos.filter(e => e.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
        return (
          <Table>
            <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Matrícula</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredEscribanos.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nombre}</TableCell>
                  <TableCell>{item.matricula}</TableCell>
                  <TableCell>{item.estado}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                    <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );
      case 'registros':
        const filteredRegistros = registros.filter(r => r.numero.toLowerCase().includes(searchTerm.toLowerCase()));
        return (
          <Table>
            <TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Titular</TableHead><TableHead>Dirección</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredRegistros.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.numero}</TableCell>
                  <TableCell>{item.titular}</TableCell>
                  <TableCell>{item.direccion}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                    <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );
      case 'aranceles':
        const filteredAranceles = aranceles.filter(a => a.tramite.toLowerCase().includes(searchTerm.toLowerCase()));
        return (
          <Table>
            <TableHeader><TableRow><TableHead>Trámite</TableHead><TableHead>Monto ($)</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredAranceles.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.tramite}</TableCell>
                  <TableCell>${item.monto.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                    <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );
    }
  };

  return (
    <DashboardLayout role="EMPLOYEE" title={titles[activeTab]} >
      
      <Card className="border-0 shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            
            {/* Buscador */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder={`Buscar en ${titles[activeTab].toLowerCase()}...`}
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Botón Nuevo */}
            <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Registro
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {renderTableContent()}
          </div>
        </CardContent>
      </Card>

      {/* MODAL MULTIUSO (Se adapta si es crear o editar, y según la pestaña activa) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar' : 'Crear'} {titles[activeTab].replace('Gestión de ', '')}
            </DialogTitle>
            <DialogDescription>
              Completa los datos del formulario para guardar los cambios en el sistema.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {activeTab === 'escribanos' && (
              <>
                <div className="space-y-2"><Label>Nombre Completo</Label><Input defaultValue={editingItem?.nombre} placeholder="Ej. Juan Pérez" /></div>
                <div className="space-y-2"><Label>Matrícula</Label><Input defaultValue={editingItem?.matricula} placeholder="Ej. 1234" /></div>
              </>
            )}
            
            {activeTab === 'registros' && (
              <>
                <div className="space-y-2"><Label>Número de Registro</Label><Input defaultValue={editingItem?.numero} placeholder="Ej. Reg-001" /></div>
                <div className="space-y-2"><Label>Titular</Label><Input defaultValue={editingItem?.titular} placeholder="Ej. Dr. López" /></div>
                <div className="space-y-2"><Label>Dirección</Label><Input defaultValue={editingItem?.direccion} /></div>
              </>
            )}

            {activeTab === 'aranceles' && (
              <>
                <div className="space-y-2"><Label>Nombre del Trámite</Label><Input defaultValue={editingItem?.tramite} placeholder="Ej. Certificación" /></div>
                <div className="space-y-2"><Label>Monto ($)</Label><Input type="number" defaultValue={editingItem?.monto} placeholder="Ej. 15000" /></div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={() => {
                // Aquí iría la lógica de Submit a tu API
                setIsModalOpen(false);
              }}>Guardar Cambios</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}