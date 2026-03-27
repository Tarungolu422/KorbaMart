import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { logout } from '../firebase';
import { ShoppingCart, Store, Truck, ShieldCheck, LogOut, Menu, User } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  profile: UserProfile | null;
}

export default function Layout({ children, profile }: LayoutProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
      <nav className="sticky top-0 z-50 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                  <ShoppingCart className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-emerald-900">KorbaKart</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {profile ? (
                <>
                  <div className="hidden md:flex items-center space-x-1 px-3 py-1 bg-stone-100 rounded-full text-xs font-medium text-stone-600">
                    {profile.role === 'customer' && <User className="w-3 h-3 mr-1" />}
                    {profile.role === 'shopkeeper' && <Store className="w-3 h-3 mr-1" />}
                    {profile.role === 'delivery' && <Truck className="w-3 h-3 mr-1" />}
                    {profile.role === 'admin' && <ShieldCheck className="w-3 h-3 mr-1" />}
                    <span className="capitalize">{profile.role}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-stone-500 hover:text-red-600 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all shadow-sm"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="bg-white border-t border-stone-200 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-stone-500 text-sm">
            Built with ❤️ for Korba, India. Bringing quick-commerce to Tier-3 cities.
          </p>
        </div>
      </footer>
    </div>
  );
}
