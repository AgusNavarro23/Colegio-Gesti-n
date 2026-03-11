import { DashboardInteligenteView } from "@/components/dashboard/views/smart-dashboard-view"

export default function EmployeeDashboardPage() {
  // Al no modificar el layout aquí, el sidebar de app/employee/layout.tsx 
  // seguirá visible envolviendo a esta View.
  return <DashboardInteligenteView />
}