'use client';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';

export default function InformesPage() {
  return (
    <DashboardLayout role="ADMIN" title="Tablero de Comando">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Trámites Mensuales</CardTitle>
            <BarChart3 className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">145</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1"/> +12% respecto al mes anterior
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Ingresos Totales</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1.250.000</div>
            <p className="text-xs text-gray-500 mt-1">Mes actual</p>
          </CardContent>
        </Card>
        
        {/* Agrega más tarjetas o integra librerías como Recharts para gráficos de barras reales */}
        
      </div>
      
      {/* Sección para gráficos más detallados o reportes en tabla */}
      <Card className="shadow-sm min-h-[300px] flex items-center justify-center bg-gray-50/50 border-dashed">
        <div className="text-center text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Área reservada para gráficos de Recharts/Chart.js</p>
        </div>
      </Card>
    </DashboardLayout>
  );
}