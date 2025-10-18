import { useState, useEffect } from 'react';
import { apiClient } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Dashboard = () => {
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

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  const statCards = [
    {
      title: 'Total Clientes',
      value: stats?.total_customers || 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      testId: 'stat-customers'
    },
    {
      title: 'Deudas Totales',
      value: `$${(stats?.total_debts || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'from-purple-500 to-purple-600',
      testId: 'stat-debts'
    },
    {
      title: 'Total Pagado',
      value: `$${(stats?.total_paid || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      testId: 'stat-paid'
    },
    {
      title: 'Deudas Vencidas',
      value: stats?.overdue_debts || 0,
      icon: AlertCircle,
      color: 'from-red-500 to-red-600',
      testId: 'stat-overdue'
    },
  ];

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-4xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          Dashboard
        </h1>
        <p className="text-gray-600">Vista general de tu negocio</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} data-testid={stat.testId} className="card-hover border-0 shadow-lg glass">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                  <Icon className="text-white" size={20} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-800" data-testid={`${stat.testId}-value`}>{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Payments */}
      <Card className="border-0 shadow-lg glass">
        <CardHeader>
          <CardTitle className="text-xl">Pagos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recent_payments && stats.recent_payments.length > 0 ? (
            <div className="space-y-4">
              {stats.recent_payments.map((payment) => (
                <div
                  key={payment.id}
                  data-testid="recent-payment-item"
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div>
                    <p className="font-medium text-gray-800" data-testid="payment-customer-name">{payment.customer_name}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(payment.payment_date), 'PPP', { locale: es })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600" data-testid="payment-amount">
                      ${payment.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 uppercase">{payment.payment_method}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay pagos recientes</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;