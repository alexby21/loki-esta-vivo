import { useState, useEffect } from 'react';
import { apiClient } from '../App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { UserPlus, Search, Edit, Trash2 } from 'lucide-react';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    notes: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async (search = '') => {
    try {
      const response = await apiClient.get('/customers', {
        params: search ? { search } : {},
      });
      setCustomers(response.data);
    } catch (error) {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    fetchCustomers(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await apiClient.put(`/customers/${editingCustomer.id}`, formData);
        toast.success('Cliente actualizado');
      } else {
        await apiClient.post('/customers', formData);
        toast.success('Cliente creado');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchCustomers(searchTerm);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar cliente');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address || '',
      email: customer.email || '',
      notes: customer.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
      try {
        await apiClient.delete(`/customers/${id}`);
        toast.success('Cliente eliminado');
        fetchCustomers(searchTerm);
      } catch (error) {
        toast.error('Error al eliminar cliente');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      email: '',
      notes: '',
    });
    setEditingCustomer(null);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Clientes
          </h1>
          <p className="text-gray-600">Gestiona tus clientes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="add-customer-button" className="flex items-center gap-2">
              <UserPlus size={20} />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="customer-dialog">
            <DialogHeader>
              <DialogTitle data-testid="customer-dialog-title">
                {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  data-testid="customer-name-input"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  data-testid="customer-phone-input"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  data-testid="customer-email-input"
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="address">Dirección</Label>
                <Input
                  data-testid="customer-address-input"
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Input
                  data-testid="customer-notes-input"
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button data-testid="customer-submit-button" type="submit" className="w-full">
                {editingCustomer ? 'Actualizar' : 'Crear'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <Input
          data-testid="customer-search-input"
          placeholder="Buscar por nombre o teléfono..."
          value={searchTerm}
          onChange={handleSearch}
          className="pl-10"
        />
      </div>

      {/* Customers Grid */}
      {loading ? (
        <div className="text-center py-12">Cargando...</div>
      ) : customers.length === 0 ? (
        <Card className="border-0 shadow-lg glass">
          <CardContent className="py-12 text-center text-gray-500">
            No hay clientes registrados
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <Card key={customer.id} data-testid="customer-card" className="card-hover border-0 shadow-lg glass">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span data-testid="customer-card-name">{customer.name}</span>
                  <div className="flex gap-2">
                    <button
                      data-testid="customer-edit-button"
                      onClick={() => handleEdit(customer)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      data-testid="customer-delete-button"
                      onClick={() => handleDelete(customer.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-gray-600" data-testid="customer-card-phone">📱 {customer.phone}</p>
                {customer.email && <p className="text-gray-600" data-testid="customer-card-email">📧 {customer.email}</p>}
                {customer.address && <p className="text-gray-600" data-testid="customer-card-address">📍 {customer.address}</p>}
                <div className="pt-2 border-t">
                  <p className="text-gray-800 font-medium" data-testid="customer-card-debt">
                    Deuda: ${customer.total_debt?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomersPage;