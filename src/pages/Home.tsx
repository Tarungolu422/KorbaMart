import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserProfile, UserRole } from '../types';
import { ShoppingBag, Store, Truck, ShieldCheck, ArrowRight, MapPin, Search, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface HomeProps {
  profile: UserProfile | null;
}

import { handleFirestoreError, OperationType } from '../App';

export default function Home({ profile }: HomeProps) {
  const navigate = useNavigate();

  const handleRoleChange = async (newRole: UserRole, path: string) => {
    if (profile) {
      try {
        const docRef = doc(db, 'users', profile.uid);
        await updateDoc(docRef, { role: newRole });
        navigate(path);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      }
    }
  };

  const roles = [
    {
      id: 'customer',
      title: 'Customer',
      description: 'Order groceries and essentials in 10 minutes.',
      icon: ShoppingBag,
      color: 'bg-emerald-100 text-emerald-700',
      path: '/customer',
    },
    {
      id: 'shopkeeper',
      title: 'Shopkeeper',
      description: 'Manage your dark store and inventory.',
      icon: Store,
      color: 'bg-indigo-100 text-indigo-700',
      path: '/shopkeeper',
    },
    {
      id: 'delivery',
      title: 'Delivery Rider',
      description: 'Deliver orders and earn on every trip.',
      icon: Truck,
      color: 'bg-amber-100 text-amber-700',
      path: '/delivery',
    },
    {
      id: 'admin',
      title: 'Admin',
      description: 'Oversee the platform and analytics.',
      icon: ShieldCheck,
      color: 'bg-stone-100 text-stone-700',
      path: '/admin',
    },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 px-4 bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50 rounded-full -ml-32 -mb-32 blur-3xl opacity-50"></div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-stone-900 mb-6">
            Hyperlocal Delivery <br />
            <span className="text-emerald-600 italic font-serif">for Korba</span>
          </h1>
          <p className="text-xl text-stone-500 max-w-2xl mx-auto mb-10">
            A full-stack dark-store model enabling 10-minute grocery delivery in Tier-3 cities.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center space-x-2 px-4 py-2 bg-stone-100 rounded-full text-sm font-medium text-stone-600">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>10-Min Delivery</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 bg-stone-100 rounded-full text-sm font-medium text-stone-600">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <span>Korba, Chhattisgarh</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 bg-stone-100 rounded-full text-sm font-medium text-stone-600">
              <Search className="w-4 h-4 text-indigo-500" />
              <span>Smart Search</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Role Selection */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-stone-900">Choose Your Role</h2>
          {profile && (
            <span className="text-sm text-stone-500">
              Currently: <span className="font-bold capitalize text-emerald-600">{profile.role}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="group"
            >
              <div 
                onClick={() => profile ? handleRoleChange(role.id as UserRole, role.path) : navigate('/login')}
                className="h-full p-6 bg-white border border-stone-200 rounded-3xl shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer flex flex-col"
              >
                <div className={`w-12 h-12 rounded-2xl ${role.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <role.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">{role.title}</h3>
                <p className="text-stone-500 text-sm mb-6 flex-grow">{role.description}</p>
                <div className="flex items-center text-emerald-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                  <span>Enter Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12">
        <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-100">
          <h4 className="text-lg font-bold text-emerald-900 mb-3">Haversine Dispatch</h4>
          <p className="text-emerald-700/80 text-sm leading-relaxed">
            Automatic assignment of the nearest available delivery rider using real-time geolocation and great-circle distance calculation.
          </p>
        </div>
        <div className="p-8 bg-indigo-50 rounded-3xl border border-indigo-100">
          <h4 className="text-lg font-bold text-indigo-900 mb-3">Dark Store Model</h4>
          <p className="text-indigo-700/80 text-sm leading-relaxed">
            Centralized hub operations for ultra-fast picking and packing, optimized for Tier-3 urban environments.
          </p>
        </div>
        <div className="p-8 bg-amber-50 rounded-3xl border border-amber-100">
          <h4 className="text-lg font-bold text-amber-900 mb-3">Role-Based Mono-App</h4>
          <p className="text-amber-700/80 text-sm leading-relaxed">
            A single platform serving Customers, Shopkeepers, and Delivery Riders with specialized interfaces and real-time sync.
          </p>
        </div>
      </section>
    </div>
  );
}
