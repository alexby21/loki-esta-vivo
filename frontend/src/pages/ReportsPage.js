import { useState, useEffect } from 'react';
import { apiClient } from '../App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download, FileText } from 'lucide-react';

const ReportsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiClient.get('/reports/export');
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Reporte exportado exitosamente');
    } catch (error) {
      toast.error('Error al exportar reporte');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Reportes
          </h1>
          <p className="text-gray-600">Estadísticas y exportación de datos</p>
        </div>
        <Button data-testid="export-report-button" onClick={handleExport} className="flex items-center gap-2">
          <Download size={20} />
          Exportar Datos
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg glass">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Total Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-800" data-testid="report-total-customers">{stats?.total_customers || 0}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg glass">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Deudas Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600" data-testid="report-total-debts">
              ${(stats?.total_debts || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg glass">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Total Pagado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600" data-testid="report-total-paid">
              ${(stats?.total_paid || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg glass">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Deudas Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600" data-testid="report-overdue-debts">{stats?.overdue_debts || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-0 shadow-lg glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={24} />
            Información del Reporte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-700">
          <p>
            El reporte exportado incluye toda la información de tu negocio:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Lista completa de clientes con sus detalles de contacto</li>
            <li>Todas las deudas registradas con estados actualizados</li>
            <li>Historial completo de pagos realizados</li>
            <li>Fecha y hora de exportación</li>
          </ul>
          <p className="text-sm text-gray-600 mt-4">
            Los datos se exportan en formato JSON, que puede ser importado a otras aplicaciones
            o analizado con herramientas de procesamiento de datos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;