// Types and rules shared by the API and the website, so they can never drift apart.
export type RoleName = 'USER' | 'ADMIN';
export type Permission = 'gallery:manage' | 'stock:manage' | 'orders:manage' | 'chat:admin';
export type OrderStatus = 'PLACED' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

// Least privilege: the owner can manage gallery, stock, orders and customer chats.
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  USER: [],
  ADMIN: ['gallery:manage', 'stock:manage', 'orders:manage', 'chat:admin'],
};

export interface User { id: string; name: string; email: string | null; phone: string | null; role: RoleName; }
export interface Variant { id: string; label: string; price: number; stock: number; }
export interface Product { id: string; slug: string; name: string; description: string; category: 'OIL' | 'DRY_FRUIT'; imageUrl: string | null; variants: Variant[]; }
export interface AdminOrder {
  id: string;
  orderNumber: string;
  customer: { name: string; phone: string; email: string | null; addressLine: string; city: string; state: string; pincode: string };
  notes: string | null;
  status: OrderStatus;
  total: number;
  createdAt: string;
  items: { name: string; label: string; quantity: number; unitPrice: number }[];
}
export interface GalleryItem { id: string; type: 'IMAGE' | 'VIDEO'; url: string; caption: string | null; }
export interface Review { id: string; name: string; rating: number; comment: string; createdAt: string; }
export interface ChatMsg { id: string; conversationId: string; fromAdmin: boolean; body: string; createdAt: string; }
export interface Conversation { id: string; user: { name: string; phone: string | null; email: string | null }; lastMessage: string; lastMessageAt: string; }
