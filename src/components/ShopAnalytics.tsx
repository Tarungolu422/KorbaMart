import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from 'recharts';
import { TrendingUp, ShoppingBag, IndianRupee, Users } from 'lucide-react';

interface ShopAnalyticsProps {
  orders: any[];
}

const ShopAnalytics: React.FC<ShopAnalyticsProps> = ({ orders }) => {
  // Process data for charts
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  
  // Daily Revenue (last 7 days)
  const dailyRevenue = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    
    const dayTotal = deliveredOrders
      .filter(o => o.createdAt?.toDate().toDateString() === d.toDateString())
      .reduce((sum, o) => sum + o.totalAmount, 0);
      
    return { name: dateStr, revenue: dayTotal };
  }).reverse();

  // Popular Categories (mocking based on order items)
  const categoryData = [
    { name: 'Vegetables', value: 45 },
    { name: 'Fruits', value: 30 },
    { name: 'Dairy', value: 15 },
    { name: 'Snacks', value: 10 },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgOrderValue = deliveredOrders.length > 0 ? Math.round(totalRevenue / deliveredOrders.length) : 0;

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `₹${totalRevenue}`, icon: IndianRupee, color: 'emerald' },
          { label: 'Orders Completed', value: deliveredOrders.length, icon: ShoppingBag, color: 'blue' },
          { label: 'Avg. Order Value', value: `₹${avgOrderValue}`, icon: TrendingUp, color: 'amber' },
          { label: 'Active Customers', value: new Set(orders.map(o => o.customerId)).size, icon: Users, color: 'indigo' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex items-center space-x-4">
            <div className={`w-12 h-12 bg-${stat.color}-50 rounded-2xl flex items-center justify-center`}>
              <stat.icon className={`text-${stat.color}-600 w-6 h-6`} />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-stone-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Chart */}
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-stone-900">Revenue (Last 7 Days)</h3>
            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">
              +12% vs last week
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#a8a29e' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#a8a29e' }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f5f5f4' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-stone-900">Popular Categories</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f4" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#44403c', fontWeight: 600 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f5f5f4' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={30}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopAnalytics;
