export type UserRole = 'customer' | 'shopkeeper' | 'delivery' | 'admin';

export interface UserProfile {
  uid: string;
  name?: string;
  email: string;
  role: UserRole;
  address?: string;
  location?: { lat: number; lng: number };
  isActive?: boolean;
}

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  category?: string;
  location: { lat: number; lng: number };
  address?: string;
  rating?: number;
  isActive?: boolean;
  approved?: boolean;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  category?: string;
  price: number;
  stock: number;
  imageUrl?: string;
  description?: string;
  isAvailable?: boolean;
}

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  shopId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  deliveryFee?: number;
  createdAt: any; // Firestore Timestamp
  riderId?: string;
  customerLocation?: { lat: number; lng: number };
  shopLocation?: { lat: number; lng: number };
  riderLocation?: { lat: number; lng: number };
  rating?: number;
  review?: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  partnerId: string;
  status: 'assigned' | 'picked_up' | 'completed';
  trackingUrl?: string;
  location: { lat: number; lng: number };
}
