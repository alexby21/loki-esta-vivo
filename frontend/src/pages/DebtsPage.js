import { useState, useEffect } from 'react';
import { apiClient } from '../App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const DebtsPage = () => {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    customer_name: '',
    description: '',
    product_type: 'camisetas',
    installment_type: 'mensual',
    total_amount: '',
    due_date: '',
  });

  useEffect(() => {
    fetchDebts();
  }, []);

  useEffect(() => {
    fetchDebts();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      const debtsRes = await apiClient.get('/debts');
      setDebts(debtsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchDebts = async () => {
    try {
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      const response = await apiClient.get('/debts', { params });
      setDebts(response.data);
    } catch (error) {
      toast.error('Error al cargar deudas');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/debts', formData);
      toast.success('Deuda creada');
      setIsDialogOpen(false);
      resetForm();
      fetchDebts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear deuda');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta venta?')) {
      try {
        await apiClient.delete(`/debts/${id}`);
        toast.success('Venta eliminada');
        fetchDebts();
      } catch (error) {
        toast.error('Error al eliminar venta');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      description: '',
      product_type: 'camisetas',
      installment_type: 'mensual',
      total_amount: '',
      due_date: '',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'status-pending',
      partial: 'status-partial',
      paid: 'status-paid',
      overdue: 'status-overdue',
    };
    return colors[status] || 'bg-gray-200 text-gray-800';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Pendiente',
      partial: 'Parcial',
      paid: 'Pagado',
      overdue: 'Vencida',
    };
    return texts[status] || status;
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Ventas
          </h1>
          <p className="text-gray-600">Gestiona las ventas de tus clientes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="add-debt-button" className="flex items-center gap-2">
              <Plus size={20} />
              Crear Venta
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="debt-dialog">
            <DialogHeader>
              <DialogTitle data-testid="debt-dialog-title">Crear Nueva Venta</DialogTitle>
              <DialogDescription>
                Registra una nueva venta para un cliente
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="customer_id">Cliente *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  required
                >
                  <SelectTrigger data-testid="debt-customer-select">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Descripción *</Label>
                <Input
                  data-testid="debt-description-input"
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="product_type">Tipo de Producto *</Label>
                <Select
                  value={formData.product_type}
                  onValueChange={(value) => setFormData({ ...formData, product_type: value })}
                >
                  <SelectTrigger data-testid="debt-product-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="camisetas">Camisetas</SelectItem>
                    <SelectItem value="pantalones">Pantalones</SelectItem>
                    <SelectItem value="chaquetas">Chaquetas</SelectItem>
                    <SelectItem value="accesorios">Accesorios</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="installment_type">Tipo de Parcelación *</Label>
                <Select
                  value={formData.installment_type}
                  onValueChange={(value) => setFormData({ ...formData, installment_type: value })}
                >
                  <SelectTrigger data-testid="debt-installment-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                    <SelectItem value="unico">Pago Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="total_amount">Monto *</Label>
                <Input
                  data-testid="debt-amount-input"
                  id="total_amount"
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="due_date">Fecha de Vencimiento</Label>
                <Input
                  data-testid="debt-duedate-input"
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <Button data-testid="debt-submit-button" type="submit" className="w-full">
                Crear Venta
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'pending', 'partial', 'paid', 'overdue'].map((status) => (
          <Button
            key={status}
            data-testid={`filter-${status}-button`}
            variant={filterStatus === status ? 'default' : 'outline'}
            onClick={() => setFilterStatus(status)}
            size="sm"
          >
            {status === 'all' ? 'Todas' : getStatusText(status)}
          </Button>
        ))}
      </div>

      {/* Debts List */}
      {loading ? (
        <div className="text-center py-12">Cargando...</div>
      ) : debts.length === 0 ? (
        <Card className="border-0 shadow-lg glass">
          <CardContent className="py-12 text-center text-gray-500">
            No hay ventas registradas
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {debts.map((debt) => (
            <Card key={debt.id} data-testid="debt-card" className="card-hover border-0 shadow-lg glass">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800" data-testid="debt-card-customer">{debt.customer_name}</h3>
                      <span className={`status-badge ${getStatusColor(debt.status)}`} data-testid="debt-card-status">
                        {getStatusText(debt.status)}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2" data-testid="debt-card-description">{debt.description}</p>
                    <div className="flex gap-4 mb-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                        📦 {debt.product_type}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs font-medium">
                        📅 {debt.installment_type}
                      </span>
                    </div>
                    <div className="flex gap-6 text-sm text-gray-500">
                      {debt.due_date && (
                        <span data-testid="debt-card-duedate">
                          📅 Vence: {format(new Date(debt.due_date), 'PPP', { locale: es })}
                        </span>
                      )}
                      <span data-testid="debt-card-created">
                        📝 Creada: {format(new Date(debt.created_at), 'PPP', { locale: es })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Monto Total</p>
                    <p className="text-2xl font-bold text-gray-800" data-testid="debt-card-total">${debt.total_amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-600 mt-2">Pendiente</p>
                    <p className="text-xl font-bold text-red-600" data-testid="debt-card-remaining">${debt.remaining_amount.toFixed(2)}</p>
                    <Button
                      data-testid="debt-delete-button"
                      onClick={() => handleDelete(debt.id)}
                      variant="destructive"
                      size="sm"
                      className="mt-4 w-full flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      Eliminar Venta
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DebtsPage;