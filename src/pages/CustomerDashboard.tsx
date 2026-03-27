import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, Timestamp, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Shop, Product, Order, OrderItem, UserRole } from '../types';
import { Search, ShoppingCart, MapPin, Star, Plus, Minus, Trash2, ArrowRight, Zap, Loader2, Store, ShoppingBag, Package, CheckCircle2, XCircle, Map as MapIcon, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { smartSearch, findNearbyShops } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import MapComponent from '../components/MapComponent';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { calculateDistance, estimateTime } from '../services/locationUtils';

export default function CustomerDashboard() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [nearbyInfo, setNearbyInfo] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [activeTab, setActiveTab] = useState<'browse' | 'orders' | 'profile'>('browse');
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [profileData, setProfileData] = useState({ name: '', address: '', phone: '', role: 'customer' as UserRole, location: { lat: 22.3595, lng: 82.7501 } });
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'orders'), where('customerId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orderList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      // Sort by createdAt descending
      setMyOrders(orderList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (error) => {
      console.error("Error fetching orders", error);
    });

    // Fetch user profile for the profile tab
    const unsubscribeProfile = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setProfileData({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          role: data.role || 'customer',
          location: data.location || { lat: 22.3595, lng: 82.7501 }
        });
      }
    });

    return () => {
      unsubscribe();
      unsubscribeProfile();
    };
  }, [auth.currentUser]);

  useEffect(() => {
    const q = query(collection(db, 'shops'), where('isActive', '==', true), where('approved', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const shopList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop));
      setShops(shopList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching shops", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedShop) {
      const q = query(collection(db, `shops/${selectedShop.id}/products`));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const productList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(productList);
      });
      return () => unsubscribe();
    }
  }, [selectedShop]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => 
          item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter(item => item.productId !== productId);
    });
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePlaceOrder = async () => {
    if (!selectedShop || cart.length === 0 || !auth.currentUser) return;

    try {
      const orderData = {
        customerId: auth.currentUser.uid,
        shopId: selectedShop.id,
        items: cart,
        status: 'pending',
        totalAmount,
        deliveryFee: 25,
        createdAt: Timestamp.now(),
        customerLocation: profileData.location,
        shopLocation: selectedShop.location,
      };
      await addDoc(collection(db, 'orders'), orderData);
      setCart([]);
      setSelectedShop(null);
      setActiveTab('orders');
      setMessage({ text: "Order placed successfully! 10-minute delivery started.", type: 'success' });
    } catch (error) {
      console.error("Error placing order", error);
      setMessage({ text: "Failed to place order. Please try again.", type: 'error' });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled' });
      setMessage({ text: "Order cancelled successfully.", type: 'success' });
    } catch (error) {
      console.error("Error cancelling order", error);
      setMessage({ text: "Failed to cancel order.", type: 'error' });
    }
  };

  const handleRateOrder = async (orderId: string, rating: number, review: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { rating, review });
      setSelectedOrder(prev => prev ? { ...prev, rating, review } : null);
      setMessage({ text: "Thank you for your feedback!", type: 'success' });
    } catch (error) {
      console.error("Error rating order", error);
      setMessage({ text: "Failed to submit rating.", type: 'error' });
    }
  };

  const handleReorder = (order: Order) => {
    const shop = shops.find(s => s.id === order.shopId);
    if (shop) {
      setSelectedShop(shop);
      setCart(order.items);
      setActiveTab('browse');
    }
  };

  const handleSmartSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const result = await smartSearch(searchQuery);
      setSearchResult(result);
    } catch (error) {
      console.error("Smart search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFindNearby = async () => {
    // Mock coordinates for Korba
    const lat = 22.3595;
    const lng = 82.7501;
    setIsSearching(true);
    try {
      const result = await findNearbyShops(lat, lng);
      setNearbyInfo(result);
    } catch (error) {
      console.error("Nearby search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), profileData);
      setMessage({ text: "Profile updated successfully!", type: 'success' });
    } catch (error) {
      console.error("Error updating profile", error);
      setMessage({ text: "Failed to update profile.", type: 'error' });
    }
  };

  const categories = ['All', 'Vegetables', 'Suhag Bhandar', 'Grocery', 'Pharmacy', 'Bakery', 'Meat', 'Fruits'];

  const filteredShops = shops.filter(shop => {
    const matchesCategory = !selectedCategory || selectedCategory === 'All' || shop.category?.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch = !searchQuery || shop.name.toLowerCase().includes(searchQuery.toLowerCase()) || shop.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-600';
      case 'accepted': return 'bg-blue-100 text-blue-600';
      case 'preparing': return 'bg-indigo-100 text-indigo-600';
      case 'out_for_delivery': return 'bg-purple-100 text-purple-600';
      case 'delivered': return 'bg-emerald-100 text-emerald-600';
      case 'cancelled': return 'bg-red-100 text-red-600';
      default: return 'bg-stone-100 text-stone-600';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-8">
      {/* Notifications */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl border flex items-center space-x-3 ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="font-bold text-sm">{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-4 hover:opacity-70">
              <Minus className="w-4 h-4 rotate-90" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Savings</p>
          <h4 className="text-xl font-bold text-emerald-900">₹{myOrders.length * 45}</h4>
        </div>
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Avg. Delivery Time</p>
          <h4 className="text-xl font-bold text-blue-900">12 mins</h4>
        </div>
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Total Orders</p>
          <h4 className="text-xl font-bold text-amber-900">{myOrders.length}</h4>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('browse')}
          className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'browse' ? 'text-emerald-600' : 'text-stone-400 hover:text-stone-600'}`}
        >
          Browse Shops
          {activeTab === 'browse' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'orders' ? 'text-emerald-600' : 'text-stone-400 hover:text-stone-600'}`}
        >
          My Orders
          {myOrders.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] rounded-full">
              {myOrders.filter(o => o.status !== 'delivered').length}
            </span>
          )}
          {activeTab === 'orders' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'profile' ? 'text-emerald-600' : 'text-stone-400 hover:text-stone-600'}`}
        >
          My Profile
          {activeTab === 'profile' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
        </button>
      </div>

      {activeTab === 'browse' && !selectedShop && (
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {activeTab === 'browse' ? (
            <>
              {/* Search & AI */}
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
                <div className="flex space-x-2">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search for groceries or shops..."
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSmartSearch()}
                    />
                  </div>
                  <button
                    onClick={handleSmartSearch}
                    disabled={isSearching}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center space-x-2 disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                    <span>Smart Search</span>
                  </button>
                </div>

                <button
                  onClick={handleFindNearby}
                  className="text-sm text-emerald-600 font-bold hover:underline flex items-center space-x-1"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Find shops near me in Korba</span>
                </button>

                <AnimatePresence>
                  {(searchResult || nearbyInfo) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-sm text-indigo-900 overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold uppercase tracking-widest text-[10px] text-indigo-500">AI Insights</span>
                        <button onClick={() => { setSearchResult(null); setNearbyInfo(null); }} className="text-indigo-400 hover:text-indigo-600">
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="prose prose-sm prose-indigo max-w-none">
                        <ReactMarkdown>{searchResult || nearbyInfo || ''}</ReactMarkdown>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Shop/Product Listing */}
              {!selectedShop ? (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-stone-900">Nearby Shops</h2>
                  {filteredShops.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center">
                      <Store className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                      <p className="text-stone-500">No shops found matching your criteria.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {filteredShops.map((shop) => (
                        <motion.div
                          key={shop.id}
                          whileHover={{ y: -4 }}
                          onClick={() => setSelectedShop(shop)}
                          className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center">
                              <Store className="text-stone-500 w-6 h-6" />
                            </div>
                            <div className="flex items-center space-x-1 px-2 py-1 bg-amber-50 rounded-lg text-amber-600 font-bold text-xs">
                              <Star className="w-3 h-3 fill-current" />
                              <span>{shop.rating || 'New'}</span>
                            </div>
                          </div>
                          <h3 className="text-lg font-bold text-stone-900">{shop.name}</h3>
                          <p className="text-stone-500 text-xs mb-4">{shop.category || 'General Store'}</p>
                          <div className="flex items-center text-stone-400 text-xs">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span>{shop.address || 'Korba, Chhattisgarh'}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedShop(null)}
                      className="text-stone-500 hover:text-stone-900 font-medium flex items-center"
                    >
                      <Minus className="w-4 h-4 mr-1 rotate-90" />
                      <span>Back to Shops</span>
                    </button>
                    <h2 className="text-2xl font-bold text-stone-900">{selectedShop.name}</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {products.map((product) => (
                      <div key={product.id} className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm flex space-x-4">
                        <div className="w-24 h-24 bg-stone-100 rounded-2xl overflow-hidden flex-shrink-0">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="text-stone-300 w-8 h-8" /></div>
                          )}
                        </div>
                        <div className="flex-grow flex flex-col justify-between">
                          <div>
                            <h4 className="font-bold text-stone-900">{product.name}</h4>
                            <p className="text-stone-500 text-xs">{product.category}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-600">₹{product.price}</span>
                            <button
                              onClick={() => addToCart(product)}
                              className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-stone-900">Your Orders</h2>
              {myOrders.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center">
                  <ShoppingBag className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                  <p className="text-stone-500">You haven't placed any orders yet.</p>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="mt-4 text-emerald-600 font-bold hover:underline"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myOrders.map((order) => (
                    <div 
                      key={order.id} 
                      onClick={() => setSelectedOrder(order)}
                      className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4 cursor-pointer hover:border-emerald-200 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Order #{order.id?.slice(-6)}</span>
                          <h3 className="font-bold text-stone-900">
                            {shops.find(s => s.id === order.shopId)?.name || 'Store'}
                          </h3>
                          <p className="text-xs text-stone-500">
                            {order.createdAt?.toDate().toLocaleString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                        <div className="text-sm">
                          <span className="text-stone-500">Total: </span>
                          <span className="font-bold text-emerald-600">₹{order.totalAmount + (order.deliveryFee || 0)}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-stone-300" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'profile' && (
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
                <h2 className="text-2xl font-bold text-stone-900">Profile Settings</h2>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Full Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={profileData.name}
                      onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Phone Number</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={profileData.phone}
                      onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Delivery Address</label>
                    <AddressAutocomplete 
                      defaultValue={profileData.address}
                      onAddressSelect={(address, location) => {
                        setProfileData({ ...profileData, address, location });
                      }}
                      placeholder="Search for your full address in Korba..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg"
                  >
                    Save Profile
                  </button>
                </form>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
                <h2 className="text-2xl font-bold text-stone-900">Switch Role</h2>
                <p className="text-sm text-stone-500">Change your role to access different dashboards (for testing purposes).</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { role: 'customer', label: 'Customer', icon: ShoppingBag, color: 'emerald' },
                    { role: 'shopkeeper', label: 'Shopkeeper', icon: Store, color: 'indigo' },
                    { role: 'delivery', label: 'Delivery Rider', icon: Truck, color: 'amber' },
                  ].map((item) => (
                    <button
                      key={item.role}
                      onClick={async () => {
                        if (auth.currentUser) {
                          await updateDoc(doc(db, 'users', auth.currentUser.uid), { role: item.role });
                          window.location.href = '/'; // Refresh to apply role change
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center space-y-2 ${
                        profileData.role === item.role 
                          ? `border-${item.color}-600 bg-${item.color}-50 text-${item.color}-600` 
                          : 'border-stone-100 bg-stone-50 text-stone-400 hover:border-stone-200'
                      }`}
                    >
                      <item.icon className="w-6 h-6" />
                      <span className="font-bold text-sm">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Cart Sidebar (only show in browse tab) */}
      {activeTab === 'browse' && (
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm sticky top-24 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-stone-900">Your Cart</h3>
              <ShoppingCart className="text-stone-400 w-5 h-5" />
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="text-stone-200 w-8 h-8" />
                </div>
                <p className="text-stone-400 text-sm">Your cart is empty.</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between group">
                      <div className="flex-grow">
                        <h5 className="text-sm font-bold text-stone-900">{item.name}</h5>
                        <p className="text-xs text-stone-500">₹{item.price} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => removeFromCart(item.productId)} className="p-1 text-stone-400 hover:text-red-500">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => addToCart({ id: item.productId, name: item.name, price: item.price } as Product)} className="p-1 text-stone-400 hover:text-emerald-500">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-stone-100 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Subtotal</span>
                    <span className="font-bold">₹{totalAmount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Delivery Fee</span>
                    <span className="font-bold">₹25</span>
                  </div>
                  <div className="flex justify-between text-lg pt-3 border-t border-stone-100">
                    <span className="font-bold text-stone-900">Total</span>
                    <span className="font-bold text-emerald-600">₹{totalAmount + 25}</span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center space-x-2"
                >
                  <span>Checkout</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setSelectedOrder(null)}
                className="absolute top-6 right-6 text-stone-400 hover:text-stone-600"
              >
                <Minus className="w-6 h-6" />
              </button>

              <div className="space-y-6">
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${getStatusColor(selectedOrder.status)}`}>
                    <Package className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-stone-900">{getStatusLabel(selectedOrder.status)}</h3>
                  <p className="text-stone-500 text-sm">Order #{selectedOrder.id?.slice(-6)}</p>
                </div>

                {/* Progress Bar */}
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-emerald-600">
                        {selectedOrder.status === 'pending' ? '10%' : 
                         selectedOrder.status === 'accepted' ? '30%' :
                         selectedOrder.status === 'preparing' ? '60%' :
                         selectedOrder.status === 'out_for_delivery' ? '90%' : '100%'}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-stone-100">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ 
                        width: selectedOrder.status === 'pending' ? '10%' : 
                               selectedOrder.status === 'accepted' ? '30%' :
                               selectedOrder.status === 'preparing' ? '60%' :
                               selectedOrder.status === 'out_for_delivery' ? '90%' : '100%'
                      }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-stone-50 p-4 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Items</h4>
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-stone-700">{item.name} x {item.quantity}</span>
                        <span className="font-bold">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-bold">
                      <span>Total</span>
                      <span className="text-emerald-600">₹{selectedOrder.totalAmount + (selectedOrder.deliveryFee || 0)}</span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <MapPin className="w-4 h-4 text-stone-400 mt-1" />
                    <div>
                      <p className="text-xs font-bold text-stone-900">Delivery to</p>
                      <p className="text-xs text-stone-500">{profileData.address || 'Korba, Chhattisgarh'}</p>
                    </div>
                  </div>

                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && selectedOrder.shopLocation && selectedOrder.customerLocation && (
                    <>
                      <div className="rounded-2xl overflow-hidden border border-stone-100 shadow-inner">
                        <MapComponent 
                          center={selectedOrder.riderLocation || selectedOrder.shopLocation} 
                          markers={[
                            { position: selectedOrder.shopLocation, label: 'S', icon: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png' },
                            { position: selectedOrder.customerLocation, label: 'C', icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' },
                            ...(selectedOrder.riderLocation ? [{ position: selectedOrder.riderLocation, label: 'R', icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' }] : [])
                          ]}
                        />
                      </div>
                      
                      {selectedOrder.riderLocation && (
                        <div className="bg-emerald-50 p-4 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Truck className="w-5 h-5 text-emerald-600" />
                            <div>
                              <p className="text-xs font-bold text-emerald-900">Rider is on the way</p>
                              <p className="text-[10px] text-emerald-600">
                                {calculateDistance(
                                  selectedOrder.riderLocation.lat,
                                  selectedOrder.riderLocation.lng,
                                  selectedOrder.customerLocation.lat,
                                  selectedOrder.customerLocation.lng
                                ).toFixed(1)} km away
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-emerald-900">ETA</p>
                            <p className="text-lg font-black text-emerald-600">
                              {estimateTime(
                                calculateDistance(
                                  selectedOrder.riderLocation.lat,
                                  selectedOrder.riderLocation.lng,
                                  selectedOrder.customerLocation.lat,
                                  selectedOrder.customerLocation.lng
                                )
                              )} min
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {selectedOrder.status === 'delivered' && (
                    <div className="bg-stone-50 p-6 rounded-3xl space-y-4">
                      <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center">Rate your experience</h4>
                      {!selectedOrder.rating ? (
                        <div className="flex flex-col items-center space-y-4">
                          <div className="flex space-x-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => handleRateOrder(selectedOrder.id, star, '')}
                                className="p-1 hover:scale-110 transition-all"
                              >
                                <Star className={`w-8 h-8 ${star <= (selectedOrder.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} />
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-stone-400">Tap a star to rate</p>
                        </div>
                      ) : (
                        <div className="text-center space-y-2">
                          <div className="flex justify-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className={`w-4 h-4 ${star <= selectedOrder.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`} />
                            ))}
                          </div>
                          <p className="text-sm font-bold text-stone-900">Thank you for your feedback!</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  {selectedOrder.status === 'pending' && (
                    <button
                      onClick={() => { handleCancelOrder(selectedOrder.id); setSelectedOrder(null); }}
                      className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all"
                    >
                      Cancel Order
                    </button>
                  )}
                  {selectedOrder.status === 'delivered' && (
                    <button
                      onClick={() => { handleReorder(selectedOrder); setSelectedOrder(null); }}
                      className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold hover:bg-emerald-100 transition-all"
                    >
                      Reorder Items
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1 py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
