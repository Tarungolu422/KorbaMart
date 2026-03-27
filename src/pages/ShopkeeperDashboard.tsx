import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, Timestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Shop, Product, Order, OrderStatus } from '../types';
import { Store, Package, ListChecks, Plus, Trash2, Edit2, CheckCircle2, Clock, Truck, Loader2, DollarSign, ShoppingBag, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ShopAnalytics from '../components/ShopAnalytics';

export default function ShopkeeperDashboard() {
  const [myShops, setMyShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showRegisterShop, setShowRegisterShop] = useState(false);
  const [showShopSettings, setShowShopSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'analytics' | 'profile'>('inventory');
  const [profileData, setProfileData] = useState({ name: '', address: '', phone: '', role: 'shopkeeper' as any });
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, stock: 0, category: '', description: '' });
  const [newShop, setNewShop] = useState({ name: '', category: '', address: '' });

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'shops'), where('ownerId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const shopList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop));
      setMyShops(shopList);
      if (shopList.length > 0 && !selectedShop) {
        setSelectedShop(shopList[0]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsubscribeProfile = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setProfileData({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          role: data.role || 'shopkeeper'
        });
      }
    });
    return () => unsubscribeProfile();
  }, []);

  useEffect(() => {
    if (selectedShop) {
      const qProducts = query(collection(db, `shops/${selectedShop.id}/products`));
      const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      });

      const qOrders = query(collection(db, 'orders'), where('shopId', '==', selectedShop.id));
      const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      });

      return () => {
        unsubscribeProducts();
        unsubscribeOrders();
      };
    }
  }, [selectedShop]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;
    try {
      await addDoc(collection(db, `shops/${selectedShop.id}/products`), {
        ...newProduct,
        shopId: selectedShop.id,
      });
      setShowAddProduct(false);
      setNewProduct({ name: '', price: 0, stock: 0, category: '', description: '' });
    } catch (error) {
      console.error("Error adding product", error);
    }
  };

  const handleRegisterShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      const shopData = {
        ...newShop,
        ownerId: auth.currentUser.uid,
        isActive: true,
        approved: true, // Auto-approve for now
        rating: 0,
        location: { lat: 22.3595, lng: 82.7501 }, // Default Korba
        createdAt: Timestamp.now(),
      };
      await addDoc(collection(db, 'shops'), shopData);
      setShowRegisterShop(false);
      setNewShop({ name: '', category: '', address: '' });
    } catch (error) {
      console.error("Error registering shop", error);
    }
  };

  const handleUpdateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;
    try {
      await updateDoc(doc(db, 'shops', selectedShop.id), {
        name: selectedShop.name,
        category: selectedShop.category,
        address: selectedShop.address
      });
      setShowShopSettings(false);
      alert("Shop settings updated!");
    } catch (error) {
      console.error("Error updating shop", error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (error) {
      console.error("Error updating order status", error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!selectedShop) return;
    try {
      await deleteDoc(doc(db, `shops/${selectedShop.id}/products`, productId));
    } catch (error) {
      console.error("Error deleting product", error);
    }
  };

  const toggleProductAvailability = async (productId: string, currentStatus: boolean) => {
    if (!selectedShop) return;
    try {
      await updateDoc(doc(db, 'shops', selectedShop.id, 'products', productId), {
        isAvailable: !currentStatus
      });
    } catch (error) {
      console.error("Error toggling availability", error);
    }
  };

  const totalEarnings = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingOrdersCount = orders.filter(o => ['pending', 'accepted', 'preparing', 'out_for_delivery'].includes(o.status)).length;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        name: profileData.name,
        address: profileData.address,
        phone: profileData.phone
      });
    } catch (error) {
      console.error("Error updating profile", error);
    }
  };

  const handleSwitchRole = async (newRole: string) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { role: newRole });
      window.location.reload();
    } catch (error) {
      console.error("Error switching role", error);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  if (myShops.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 shadow-sm">
          <Store className="w-16 h-16 text-stone-200 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-stone-900 mb-2">No Shops Found</h2>
          <p className="text-stone-500 mb-6">You haven't registered any shops yet.</p>
          <button 
            onClick={() => setShowRegisterShop(true)}
            className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all"
          >
            Register Your Shop
          </button>
        </div>

        <AnimatePresence>
          {showRegisterShop && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl"
              >
                <h3 className="text-2xl font-bold text-stone-900 mb-6">Register Your Shop</h3>
                <form onSubmit={handleRegisterShop} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Shop Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newShop.name}
                      onChange={e => setNewShop({ ...newShop, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Category</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g., Grocery, Pharmacy, Bakery"
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newShop.category}
                      onChange={e => setNewShop({ ...newShop, category: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Shop Address</label>
                    <textarea
                      required
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px]"
                      value={newShop.address}
                      onChange={e => setNewShop({ ...newShop, address: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowRegisterShop(false)}
                      className="flex-grow py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-grow py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
                    >
                      Register
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Shop Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">Shopkeeper Dashboard</h2>
          <p className="text-stone-500">Manage your inventory and orders for {selectedShop?.name}</p>
        </div>
        <div className="flex items-center space-x-2">
          {myShops.map(shop => (
            <button
              key={shop.id}
              onClick={() => setSelectedShop(shop)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${selectedShop?.id === shop.id ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}
            >
              {shop.name}
            </button>
          ))}
          <button
            onClick={() => setShowShopSettings(true)}
            className="p-2 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-all"
            title="Shop Settings"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          {activeTab === 'analytics' && (
            <ShopAnalytics orders={orders} />
          )}
        </div>
      </div>

      <div className="space-y-8">
        {/* KPI Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Sales</p>
            <h4 className="text-xl font-bold text-emerald-900">₹{totalEarnings}</h4>
          </div>
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Pending Orders</p>
            <h4 className="text-xl font-bold text-amber-900">{orders.filter(o => o.status === 'pending').length}</h4>
          </div>
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Inventory Health</p>
            <h4 className="text-xl font-bold text-blue-900">{products.filter(p => p.stock < 10).length} Low</h4>
          </div>
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Active Deliveries</p>
            <h4 className="text-xl font-bold text-indigo-900">{orders.filter(o => o.status === 'out_for_delivery').length}</h4>
          </div>
        </div>

        {/* Shop Navigation Tabs */}
        <div className="flex items-center space-x-6 border-b border-stone-100">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'inventory' ? 'text-emerald-600' : 'text-stone-400 hover:text-stone-600'}`}
          >
            Inventory
            {activeTab === 'inventory' && <motion.div layoutId="shopTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'orders' ? 'text-emerald-600' : 'text-stone-400 hover:text-stone-600'}`}
          >
            Orders
            {pendingOrdersCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] rounded-full">
                {pendingOrdersCount}
              </span>
            )}
            {activeTab === 'orders' && <motion.div layoutId="shopTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'analytics' ? 'text-emerald-600' : 'text-stone-400 hover:text-stone-600'}`}
          >
            Analytics
            {activeTab === 'analytics' && <motion.div layoutId="shopTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'profile' ? 'text-emerald-600' : 'text-stone-400 hover:text-stone-600'}`}
          >
            Profile
            {activeTab === 'profile' && <motion.div layoutId="shopTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
          </button>
        </div>

        {activeTab === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Inventory Management */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <Package className="text-emerald-600 w-6 h-6" />
                    <h3 className="text-xl font-bold text-stone-900">Inventory</h3>
                  </div>
                  <button
                    onClick={() => setShowAddProduct(true)}
                    className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {products.map(product => (
                    <div key={product.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between group">
                      <div>
                        <h4 className="font-bold text-stone-900">{product.name}</h4>
                        <p className="text-xs text-stone-500">₹{product.price} • {product.stock} in stock</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleProductAvailability(product.id, product.isAvailable !== false)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            product.isAvailable !== false ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                        >
                          {product.isAvailable !== false ? 'In Stock' : 'Out of Stock'}
                        </button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-stone-400 hover:text-red-600 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-6">
                <ListChecks className="text-indigo-600 w-6 h-6" />
                <h3 className="text-xl font-bold text-stone-900">Recent Orders</h3>
              </div>

              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="text-center py-12 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
                    <ShoppingBag className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                    <p className="text-stone-400">No orders yet.</p>
                  </div>
                ) : (
                  orders.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)).map(order => (
                    <div key={order.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Order #{order.id.slice(-4)}</span>
                          <h5 className="text-sm font-bold text-stone-900">₹{order.totalAmount}</h5>
                        </div>
                        <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                          order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                          order.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
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

                      <div className="pt-2 flex gap-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'accepted')}
                            className="flex-grow py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all"
                          >
                            Accept
                          </button>
                        )}
                        {order.status === 'accepted' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                            className="flex-grow py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all"
                          >
                            Start Preparing
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                            className="flex-grow py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center justify-center space-x-1"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Dispatch</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
              <h3 className="text-xl font-bold text-stone-900 mb-6">Profile Settings</h3>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Shop Address</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={profileData.address}
                    onChange={e => setProfileData({ ...profileData, address: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all"
                >
                  Save Profile
                </button>
              </form>
            </div>

            <div className="bg-amber-50 p-8 rounded-3xl border border-amber-100">
              <h3 className="text-xl font-bold text-amber-900 mb-2">Switch Role</h3>
              <p className="text-sm text-amber-700 mb-6">Testing different perspectives? Switch your account role here.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: 'customer', label: 'Customer', icon: ShoppingBag },
                  { id: 'shopkeeper', label: 'Shopkeeper', icon: Store },
                  { id: 'delivery', label: 'Delivery Rider', icon: Truck }
                ].map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleSwitchRole(role.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${profileData.role === role.id ? 'bg-white border-amber-500 text-amber-900 shadow-md' : 'bg-amber-100/50 border-transparent text-amber-700 hover:bg-amber-100'}`}
                  >
                    <role.icon className="w-6 h-6 mb-2" />
                    <span className="text-xs font-bold">{role.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-stone-900 mb-6">Add New Product</h3>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Product Name</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={newProduct.name}
                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Price (₹)</label>
                    <input
                      required
                      type="number"
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newProduct.price}
                      onChange={e => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Stock</label>
                    <input
                      required
                      type="number"
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newProduct.stock}
                      onChange={e => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Category</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={newProduct.category}
                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    className="flex-grow py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-grow py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
                  >
                    Add Product
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shop Settings Modal */}
      <AnimatePresence>
        {showShopSettings && selectedShop && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-stone-900 mb-6">Shop Settings</h3>
              <form onSubmit={handleUpdateShop} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Shop Name</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={selectedShop.name}
                    onChange={e => setSelectedShop({ ...selectedShop, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Category</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={selectedShop.category}
                    onChange={e => setSelectedShop({ ...selectedShop, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Shop Address</label>
                  <textarea
                    required
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px]"
                    value={selectedShop.address}
                    onChange={e => setSelectedShop({ ...selectedShop, address: e.target.value })}
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowShopSettings(false)}
                    className="flex-grow py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-grow py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
