'use client';

import { useState } from 'react';
import { DashboardLayout } from '../dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';

export function ArancelesView({ role }: { role: 'ADMIN' | 'EMPLOYEE' }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data temporal
  const [aranceles] = useState([
    { id: '1', tramite: 'Certificación de Firma', monto: 15000 },
    { id: '2', tramite: 'Poder General', monto: 45000 },
    { id: '3', tramite: 'Acta Notarial', monto: 35000 },
  ]);

  // Filtrado simple
  const filteredAranceles = aranceles.filter(a => 
    a.tramite.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout role={role} title="Gestión de Aranceles">
      <Card className="border-0 shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar trámite..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button className="w-full sm:w-auto gap-2">
              <Plus className="w-4 h-4" /> 
              Nuevo Arancel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead>Trámite</TableHead>
                  <TableHead>Monto ($)</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAranceles.map(item => (
                  <TableRow key={item.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-medium text-gray-900">{item.tramite}</TableCell>
                    <TableCell className="text-gray-600">
                      ${item.monto.toLocaleString('es-AR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredAranceles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      No se encontraron aranceles
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}