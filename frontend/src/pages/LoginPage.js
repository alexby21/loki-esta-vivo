import { useState } from 'react';
import { apiClient } from '../App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const LoginPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? { username: formData.username, password: formData.password }
        : formData;

      const response = await apiClient.post(endpoint, payload);
      const { access_token, user } = response.data;

      onLogin(access_token, user);
      toast.success(isLogin ? '¡Bienvenido!' : '¡Cuenta creada exitosamente!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-stone-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            SEMI DEUS ART
          </h1>
          <p className="text-gray-600 text-sm">Sistema de Gestión de Deudas</p>
        </div>

        <Card data-testid="login-card" className="shadow-xl border-0 glass">
          <CardHeader>
            <CardTitle data-testid="login-title" className="text-2xl">{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</CardTitle>
            <CardDescription data-testid="login-description">
              {isLogin
                ? 'Ingresa tus credenciales para continuar'
                : 'Completa el formulario para registrarte'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username" data-testid="username-label">Usuario</Label>
                <Input
                  data-testid="username-input"
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="mt-1"
                />
              </div>

              {!isLogin && (
                <div>
                  <Label htmlFor="email" data-testid="email-label">Email</Label>
                  <Input
                    data-testid="email-input"
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="password" data-testid="password-label">Contraseña</Label>
                <Input
                  data-testid="password-input"
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="mt-1"
                />
              </div>

              <Button
                data-testid="submit-button"
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : 'Registrarse'}
              </Button>

              <div className="text-center mt-4">
                <button
                  data-testid="toggle-auth-button"
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;