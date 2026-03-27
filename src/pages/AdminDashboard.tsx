import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, updateDoc, doc, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Shop, UserProfile, Order } from '../types';
import { ShieldCheck, Users, Store, ListChecks, TrendingUp, CheckCircle2, XCircle, Loader2, DollarSign, Database } from 'lucide-react';
import { motion } from 'motion/react';
import { complexReasoning } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { addDoc, Timestamp } from 'firebase/firestore';

export default function AdminDashboard() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    const unsubscribeShops = onSnapshot(collection(db, 'shops'), (snapshot) => {
      setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop)));
    });

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as unknown as UserProfile)));
    });

    const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    });

    return () => {
      unsubscribeShops();
      unsubscribeUsers();
      unsubscribeOrders();
    };
  }, []);

  const approveShop = async (shopId: string, approved: boolean) => {
    try {
      await updateDoc(doc(db, 'shops', shopId), { approved, isActive: approved });
    } catch (error) {
      console.error("Error approving shop", error);
    }
  };

  const seedData = async () => {
    setIsSeeding(true);
    try {
      // Seed a Vegetable Shop
      const vegShopRef = await addDoc(collection(db, 'shops'), {
        ownerId: 'system',
        name: 'Local Sabzi Mandi',
        category: 'Vegetables',
        location: { lat: 22.3595, lng: 82.7501 },
        address: 'Main Market Square, Korba',
        rating: 4.9,
        isActive: true,
        approved: true
      });

      const vegProducts = [
        { name: 'Fresh Spinach (250g)', price: 20, stock: 100, category: 'Vegetables' },
        { name: 'Organic Tomatoes (1kg)', price: 40, stock: 50, category: 'Vegetables' },
        { name: 'Potatoes (2kg)', price: 50, stock: 80, category: 'Vegetables' },
        { name: 'Green Chillies (100g)', price: 15, stock: 60, category: 'Vegetables' },
      ];

      for (const p of vegProducts) {
        await addDoc(collection(db, `shops/${vegShopRef.id}/products`), {
          ...p,
          shopId: vegShopRef.id,
          imageUrl: `https://picsum.photos/seed/${p.name.replace(/\s/g, '')}/200/200`
        });
      }

      // Seed a Suhag Bhandar
      const suhagShopRef = await addDoc(collection(db, 'shops'), {
        ownerId: 'system',
        name: 'Shringar Suhag Bhandar',
        category: 'Suhag Bhandar',
        location: { lat: 22.3610, lng: 82.7520 },
        address: 'Women\'s Market, Korba',
        rating: 4.7,
        isActive: true,
        approved: true
      });

      const suhagProducts = [
        { name: 'Bridal Bangle Set', price: 450, stock: 20, category: 'Jewelry' },
        { name: 'Premium Mehendi Cones', price: 25, stock: 200, category: 'Cosmetics' },
        { name: 'Designer Bindi Pack', price: 30, stock: 150, category: 'Cosmetics' },
        { name: 'Silk Saree Latkan', price: 120, stock: 40, category: 'Accessories' },
      ];

      for (const p of suhagProducts) {
        await addDoc(collection(db, `shops/${suhagShopRef.id}/products`), {
          ...p,
          shopId: suhagShopRef.id,
          imageUrl: `https://picsum.photos/seed/${p.name.replace(/\s/g, '')}/200/200`
        });
      }

      alert("Market-ready seed data created successfully!");
    } catch (error) {
      console.error("Seeding failed", error);
    } finally {
      setIsSeeding(false);
    }
  };

  const getAiInsight = async () => {
    setIsThinking(true);
    try {
      const stats = `
        Total Shops: ${shops.length}
        Total Users: ${users.length}
        Total Orders: ${orders.length}
        Total Revenue: ₹${orders.reduce((sum, o) => sum + o.totalAmount, 0)}
        Pending Approvals: ${shops.filter(s => !s.approved).length}
        Vegetable Shops: ${shops.filter(s => s.category === 'Vegetables').length}
        Suhag Bhandar Shops: ${shops.filter(s => s.category === 'Suhag Bhandar').length}
      `;
      const prompt = `As an AI Market Launch Strategist for BlinkLocal, analyze these platform stats and provide a 3-step launch plan for Korba, focusing on local vegetable markets and women's specialty shops: ${stats}`;
      const result = await complexReasoning(prompt);
      setAiInsight(result);
    } catch (error) {
      console.error("AI insight failed", error);
    } finally {
      setIsThinking(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-8">
      {/* Header & AI Insight */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">Admin Control Panel</h2>
          <p className="text-stone-500">Platform-wide overview and management.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={seedData}
            disabled={isSeeding}
            className="px-6 py-3 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {isSeeding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
            <span>Seed Data</span>
          </button>
          <button
            onClick={getAiInsight}
            disabled={isThinking}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center space-x-2 shadow-lg disabled:opacity-50"
          >
            {isThinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
            <span>Get AI Strategy</span>
          </button>
        </div>
      </div>

      {aiInsight && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 bg-indigo-50 rounded-3xl border border-indigo-100 shadow-sm"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">Strategic Insights (Gemini 3.1 Pro)</span>
            <button onClick={() => setAiInsight(null)} className="text-indigo-400 hover:text-indigo-600">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="prose prose-indigo max-w-none">
            <ReactMarkdown>{aiInsight}</ReactMarkdown>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `₹${totalRevenue}`, icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Active Users', value: users.length, icon: Users, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Total Shops', value: shops.length, icon: Store, color: 'bg-amber-50 text-amber-600' },
          { label: 'Total Orders', value: orders.length, icon: ListChecks, color: 'bg-stone-50 text-stone-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-bold text-stone-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Launch Readiness Checklist */}
      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="text-emerald-600 w-6 h-6" />
          <h3 className="text-xl font-bold text-stone-900">Market Launch Readiness</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Shop Onboarding', status: shops.filter(s => s.approved).length >= 5, detail: `${shops.filter(s => s.approved).length}/5 Shops Approved` },
            { label: 'Rider Network', status: users.filter(u => u.role === 'delivery').length >= 3, detail: `${users.filter(u => u.role === 'delivery').length}/3 Riders Registered` },
            { label: 'Inventory Coverage', status: shops.some(s => s.category === 'Vegetables') && shops.some(s => s.category === 'Suhag Bhandar'), detail: 'Veg & Suhag Bhandar Active' },
          ].map((item, i) => (
            <div key={i} className={`p-4 rounded-2xl border ${item.status ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${item.status ? 'text-emerald-600' : 'text-red-600'}`}>{item.label}</span>
                {item.status ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
              </div>
              <p className={`text-sm font-bold ${item.status ? 'text-emerald-900' : 'text-red-900'}`}>{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Management Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shop Approvals */}
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-2">
            <Store className="text-amber-600 w-6 h-6" />
            <h3 className="text-xl font-bold text-stone-900">Shop Approvals</h3>
          </div>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {shops.filter(s => !s.approved).map(shop => (
              <div key={shop.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900">{shop.name}</h4>
                  <p className="text-xs text-stone-500">{shop.category} • {shop.address}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => approveShop(shop.id, true)}
                    className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <button className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {shops.filter(s => !s.approved).length === 0 && (
              <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                <Store className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                <p className="text-stone-400 text-sm">No pending approvals.</p>
              </div>
            )}
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-2">
            <Users className="text-indigo-600 w-6 h-6" />
            <h3 className="text-xl font-bold text-stone-900">Recent Users</h3>
          </div>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {users.slice(0, 10).map(user => (
              <div key={user.uid} className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-stone-200 rounded-full flex items-center justify-center text-stone-500 text-xs font-bold">
                    {user.name?.[0] || 'A'}
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900">{user.name || 'Anonymous'}</h4>
                    <p className="text-[10px] text-stone-500">{user.email}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                  user.role === 'customer' ? 'bg-emerald-100 text-emerald-700' :
                  user.role === 'shopkeeper' ? 'bg-indigo-100 text-indigo-700' :
                  user.role === 'delivery' ? 'bg-amber-100 text-amber-700' :
                  'bg-stone-100 text-stone-700'
                }`}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Orders Oversight */}
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ListChecks className="text-emerald-600 w-6 h-6" />
              <h3 className="text-xl font-bold text-stone-900">Platform Orders Oversight</h3>
            </div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Showing last 20 orders</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)).slice(0, 20).map(order => (
              <div key={order.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Order #{order.id.slice(-4)}</span>
                    <h5 className="text-sm font-bold text-stone-900">₹{order.totalAmount}</h5>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                    order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                    order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-indigo-100 text-indigo-700'
                  }`}>
                    {order.status.replace('_', ' ')}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {order.items.map((item, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 bg-white border border-stone-200 rounded-full text-stone-600">
                      {item.quantity}x {item.name}
                    </span>
                  ))}
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between items-center">
                  <span className="text-[10px] text-stone-400 uppercase font-bold">Shop ID: {order.shopId.slice(-4)}</span>
                  <span className="text-[10px] text-stone-400 uppercase font-bold">Rider: {order.riderId ? order.riderId.slice(-4) : 'Unassigned'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
