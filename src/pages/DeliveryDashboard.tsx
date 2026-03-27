import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Order, OrderStatus } from '../types';
import { Truck, MapPin, Navigation, CheckCircle2, Package, Clock, Loader2, Phone, Star, Map as MapIcon } from 'lucide-react';
import { motion } from 'motion/react';
import MapComponent from '../components/MapComponent';
import { calculateDistance, estimateTime } from '../services/locationUtils';

export default function DeliveryDashboard() {
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'available' | 'profile'>('available');

  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Orders assigned to this rider
    const qAssigned = query(
      collection(db, 'orders'), 
      where('riderId', '==', auth.currentUser.uid),
      where('status', 'in', ['preparing', 'out_for_delivery'])
    );
    const unsubscribeAssigned = onSnapshot(qAssigned, (snapshot) => {
      setAssignedOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    });

    // Orders available for any rider (status 'pending', 'accepted', 'preparing', or 'out_for_delivery' and no riderId)
    const qAvailable = query(
      collection(db, 'orders'),
      where('status', 'in', ['pending', 'accepted', 'preparing', 'out_for_delivery'])
    );
    const unsubscribeAvailable = onSnapshot(qAvailable, (snapshot) => {
      // Filter out orders that already have a rider assigned (Firestore where 'riderId', '==', null is tricky)
      setAvailableOrders(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Order))
        .filter(order => !order.riderId)
      );
    });

    return () => {
      unsubscribeAssigned();
      unsubscribeAvailable();
    };
  }, []);

  // Update rider location periodically
  useEffect(() => {
    if (!isOnline || assignedOrders.length === 0 || !auth.currentUser) return;

    const updateLocation = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          const riderLocation = { lat: latitude, lng: longitude };
          
          // Update all active assigned orders with current rider location
          for (const order of assignedOrders) {
            if (order.status === 'out_for_delivery' || order.status === 'preparing') {
              await updateDoc(doc(db, 'orders', order.id), { riderLocation });
            }
          }
        });
      }
    };

    const interval = setInterval(updateLocation, 10000); // Every 10 seconds
    updateLocation(); // Initial update

    return () => clearInterval(interval);
  }, [isOnline, assignedOrders, auth.currentUser]);

  const acceptOrder = async (orderId: string) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        riderId: auth.currentUser.uid,
        status: 'preparing' // Move to preparing if not already
      });
      setActiveTab('active');
    } catch (error) {
      console.error("Error accepting order", error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (error) {
      console.error("Error updating order status", error);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-8">
      {/* Header & Status Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">Delivery Rider</h2>
          <p className="text-stone-500">You are currently <span className={isOnline ? 'text-emerald-600 font-bold' : 'text-stone-400 font-bold'}>{isOnline ? 'Online' : 'Offline'}</span></p>
        </div>
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`px-8 py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center space-x-2 ${
            isOnline ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {isOnline ? <span>Go Offline</span> : <span>Go Online</span>}
        </button>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Daily Earnings</p>
          <h4 className="text-xl font-bold text-emerald-900">₹{assignedOrders.filter(o => o.status === 'delivered').length * 40}</h4>
        </div>
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Deliveries Done</p>
          <h4 className="text-xl font-bold text-blue-900">{assignedOrders.filter(o => o.status === 'delivered').length}</h4>
        </div>
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Performance Score</p>
          <h4 className="text-xl font-bold text-amber-900">4.9 ★</h4>
        </div>
      </div>

      {isOnline && (
        <div className="flex items-center space-x-6 border-b border-stone-100">
          <button
            onClick={() => setActiveTab('available')}
            className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'available' ? 'text-emerald-600' : 'text-stone-400 hover:text-stone-600'}`}
          >
            Available Jobs
            {availableOrders.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] rounded-full">
                {availableOrders.length}
              </span>
            )}
            {activeTab === 'available' && <motion.div layoutId="riderTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'active' ? 'text-emerald-600' : 'text-stone-400 hover:text-stone-600'}`}
          >
            Active Deliveries
            {assignedOrders.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] rounded-full">
                {assignedOrders.length}
              </span>
            )}
            {activeTab === 'active' && <motion.div layoutId="riderTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'profile' ? 'text-emerald-600' : 'text-stone-400 hover:text-stone-600'}`}
          >
            Earnings & Profile
            {activeTab === 'profile' && <motion.div layoutId="riderTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
          </button>
        </div>
      )}

      {!isOnline ? (
        <div className="text-center py-20 bg-stone-50 rounded-3xl border border-dashed border-stone-300">
          <Clock className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-stone-400">Go online to see assignments</h3>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'available' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableOrders.length === 0 ? (
                <div className="md:col-span-2 text-center py-20 bg-white rounded-3xl border border-stone-200">
                  <Package className="w-16 h-16 text-stone-100 mx-auto mb-4" />
                  <p className="text-stone-400">No new orders available right now.</p>
                </div>
              ) : (
                availableOrders.map(order => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-6"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                          <Package className="text-emerald-600 w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900">₹{order.totalAmount} Order</h4>
                          <p className="text-xs text-stone-500">{order.items.length} items • ₹25 delivery fee</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase">
                        New Request
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-4 h-4 text-stone-400 mt-1" />
                        <p className="text-sm text-stone-700">Pickup: Korba Hub #1</p>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Navigation className="w-4 h-4 text-emerald-500 mt-1" />
                        <p className="text-sm text-stone-700">Drop: Customer Location</p>
                      </div>
                    </div>

                    <button
                      onClick={() => acceptOrder(order.id)}
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2"
                    >
                      <Truck className="w-5 h-5" />
                      <span>Accept Delivery</span>
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {activeTab === 'active' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assignedOrders.length === 0 ? (
                <div className="md:col-span-2 text-center py-20 bg-white rounded-3xl border border-stone-200">
                  <Package className="w-16 h-16 text-stone-100 mx-auto mb-4" />
                  <p className="text-stone-400">No active assignments. Accept a job from the "Available" tab.</p>
                </div>
              ) : (
                assignedOrders.map(order => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-6"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                          <Package className="text-indigo-600 w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900">Order #{order.id.slice(-4)}</h4>
                          <p className="text-xs text-stone-500">{order.items.length} items • ₹{order.totalAmount}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        order.status === 'preparing' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-4 h-4 text-stone-400 mt-1" />
                        <div>
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Pickup</p>
                          <p className="text-sm text-stone-700">Korba Dark Store Hub #1</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Navigation className="w-4 h-4 text-emerald-500 mt-1" />
                        <div>
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Delivery</p>
                          <p className="text-sm text-stone-700">Customer Address, Korba</p>
                          {order.customerLocation && order.riderLocation && (
                            <p className="text-[10px] text-emerald-600 font-bold">
                              {calculateDistance(
                                order.riderLocation.lat,
                                order.riderLocation.lng,
                                order.customerLocation.lat,
                                order.customerLocation.lng
                              ).toFixed(1)} km away • {estimateTime(calculateDistance(order.riderLocation.lat, order.riderLocation.lng, order.customerLocation.lat, order.customerLocation.lng))} min
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {order.shopLocation && order.customerLocation && (
                      <div className="rounded-2xl overflow-hidden border border-stone-100 shadow-inner">
                        <MapComponent 
                          center={order.riderLocation || order.shopLocation} 
                          markers={[
                            { position: order.shopLocation, label: 'S', icon: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png' },
                            { position: order.customerLocation, label: 'C', icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' },
                            ...(order.riderLocation ? [{ position: order.riderLocation, label: 'R', icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' }] : [])
                          ]}
                        />
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button className="p-3 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-all">
                        <Phone className="w-5 h-5" />
                      </button>
                      {order.status === 'preparing' ? (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                          className="flex-grow py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Mark Picked Up</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                          className="flex-grow py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Mark Delivered</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Today's Earnings</p>
                  <h4 className="text-4xl font-bold text-emerald-900">₹450</h4>
                  <p className="text-xs text-emerald-600 mt-2">12 deliveries completed</p>
                </div>
                <div className="bg-indigo-50 p-8 rounded-3xl border border-indigo-100">
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Rider Rating</p>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-4xl font-bold text-indigo-900">4.9</h4>
                    <Star className="w-6 h-6 text-amber-400 fill-current" />
                  </div>
                  <p className="text-xs text-indigo-600 mt-2">Top 5% in Korba</p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                <h3 className="text-xl font-bold text-stone-900 mb-6">Rider Profile</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-stone-100">
                    <span className="text-stone-500">Vehicle</span>
                    <span className="font-bold text-stone-900">Electric Scooter</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-stone-100">
                    <span className="text-stone-500">License Status</span>
                    <span className="text-emerald-600 font-bold">Verified</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-stone-500">Joined</span>
                    <span className="font-bold text-stone-900">Jan 2024</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
