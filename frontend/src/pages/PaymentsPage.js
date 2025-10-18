import { useState, useEffect } from 'react';
import { apiClient } from '../App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    debt_id: '',
    amount: '',
    payment_method: 'cash',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, debtsRes] = await Promise.all([
        apiClient.get('/payments'),
        apiClient.get('/debts'),
      ]);
      setPayments(paymentsRes.data);
      // Filter only unpaid or partially paid debts
      setDebts(debtsRes.data.filter(d => d.status !== 'paid'));
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/payments', formData);
      toast.success('Pago registrado exitosamente');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar pago');
    }
  };

  const resetForm = () => {
    setFormData({
      debt_id: '',
      amount: '',
      payment_method: 'cash',
      notes: '',
    });
  };

  const selectedDebt = debts.find(d => d.id === formData.debt_id);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Pagos
          </h1>
          <p className="text-gray-600">Registra y visualiza pagos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="add-payment-button" className="flex items-center gap-2">
              <DollarSign size={20} />
              Registrar Pago
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="payment-dialog">
            <DialogHeader>
              <DialogTitle data-testid="payment-dialog-title">Registrar Pago</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="debt_id">Deuda *</Label>
                <Select
                  value={formData.debt_id}
                  onValueChange={(value) => setFormData({ ...formData, debt_id: value })}
                  required
                >
                  <SelectTrigger data-testid="payment-debt-select">
                    <SelectValue placeholder="Selecciona una deuda" />
                  </SelectTrigger>
                  <SelectContent>
                    {debts.map((debt) => (
                      <SelectItem key={debt.id} value={debt.id}>
                        {debt.customer_name} - ${debt.remaining_amount.toFixed(2)} pendiente
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDebt && (
                  <p className="text-sm text-gray-600 mt-1" data-testid="payment-remaining-amount">
                    Monto pendiente: ${selectedDebt.remaining_amount.toFixed(2)}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="amount">Monto *</Label>
                <Input
                  data-testid="payment-amount-input"
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  max={selectedDebt?.remaining_amount || undefined}
                />
              </div>
              <div>
                <Label htmlFor="payment_method">Método de Pago *</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger data-testid="payment-method-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Input
                  data-testid="payment-notes-input"
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button data-testid="payment-submit-button" type="submit" className="w-full">
                Registrar Pago
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payments List */}
      {loading ? (
        <div className="text-center py-12">Cargando...</div>
      ) : payments.length === 0 ? (
        <Card className="border-0 shadow-lg glass">
          <CardContent className="py-12 text-center text-gray-500">
            No hay pagos registrados
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <Card key={payment.id} data-testid="payment-card" className="card-hover border-0 shadow-lg glass">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2" data-testid="payment-card-customer">
                      {payment.customer_name}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p data-testid="payment-card-date">
                        📅 {format(new Date(payment.payment_date), 'PPP', { locale: es })}
                      </p>
                      <p data-testid="payment-card-method">💳 Método: {payment.payment_method === 'cash' ? 'Efectivo' : payment.payment_method === 'card' ? 'Tarjeta' : 'Transferencia'}</p>
                      {payment.notes && <p data-testid="payment-card-notes">📝 {payment.notes}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-600" data-testid="payment-card-amount">
                      ${payment.amount.toFixed(2)}
                    </p>
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

export default PaymentsPage;