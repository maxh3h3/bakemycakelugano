'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import { adminTranslations as t } from '@/lib/admin-translations';

type LoginRole = 'owner' | 'cook';

export default function AdminLoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<LoginRole>('owner');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role, password, rememberMe }),
      });

      const data = await response.json();

      if (data.success) {
        const redirectTo = data.role === 'cook' ? '/admin/production' : '/admin/orders';
        router.push(redirectTo);
        router.refresh();
      } else {
        setError(data.error || t.invalidPassword);
        setIsLoading(false);
      }
    } catch (err) {
      setError(t.loginError);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-cream-100 to-rose-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/icons/bmk_logo.png"
              alt="Bake My Cake"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
          <h1 className="text-4xl font-heading font-bold text-brown-500 mb-2">
            {t.loginTitle}
          </h1>
          <p className="text-charcoal-700">
            {t.loginWelcome}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-cream-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role */}
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-charcoal-900 mb-2"
              >
                {t.loginRole}
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as LoginRole)}
                className="w-full px-4 py-3 rounded-full border-2 border-cream-300 focus:border-brown-500 focus:outline-none focus:ring-2 focus:ring-brown-500/20 transition-all bg-cream-50/50"
                disabled={isLoading}
              >
                <option value="owner">{t.loginRoleOwner}</option>
                <option value="cook">{t.loginRoleCook}</option>
              </select>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-charcoal-900 mb-2"
              >
                {t.password}
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-full border-2 border-cream-300 focus:border-brown-500 focus:outline-none focus:ring-2 focus:ring-brown-500/20 transition-all bg-cream-50/50"
                placeholder={t.passwordPlaceholder}
                required
                autoFocus
                disabled={isLoading}
              />
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-cream-300 text-brown-500 focus:ring-brown-500 focus:ring-offset-0"
                disabled={isLoading}
              />
              <label
                htmlFor="rememberMe"
                className="ml-2 block text-sm text-charcoal-700"
              >
                {t.rememberMe}
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-rose-100 border-2 border-rose-300 text-rose-700 px-4 py-3 rounded-2xl text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? t.loggingIn : t.login}
            </Button>
          </form>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-cream-200">
            <p className="text-xs text-center text-charcoal-500">
              {t.secureAccess}
              <br />
              {t.forgotPassword}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
