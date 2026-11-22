import { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { clean, notifyOwner, waLink } from '../../lib/whatsapp';
import { AppError } from '../../utils/errors';

export interface PlaceOrderInput {
  customer: { name: string; phone: string; email?: string; addressLine: string; city: string; state: string; pincode: string };
  items: { variantId: string; quantity: number }[];
  notes?: string;
}

const orderCode = (n: number) => `VSP-${String(n).padStart(5, '0')}`;

export async function placeOrder(input: PlaceOrderInput, userId?: string) {
  // Merge duplicate lines so stock is decremented once per variant.
  const qty = new Map<string, number>();
  for (const i of input.items) qty.set(i.variantId, (qty.get(i.variantId) ?? 0) + i.quantity);
  const ids = [...qty.keys()];

  const order = await prisma.$transaction(async (tx) => {
    // Prices come from the DB, never from the client (A04: insecure design / tampering).
    const variants = await tx.productVariant.findMany({
      where: { id: { in: ids }, isActive: true, product: { isActive: true } }, include: { product: true },
    });
    if (variants.length !== ids.length) throw new AppError(400, 'An item in your cart is no longer available');

    let total = new Prisma.Decimal(0);
    for (const v of variants) {
      const q = qty.get(v.id)!;
      // Atomic conditional decrement: two buyers can never take the last unit.
      const r = await tx.productVariant.updateMany({ where: { id: v.id, stock: { gte: q } }, data: { stock: { decrement: q } } });
      if (r.count === 0) throw new AppError(409, `${v.product.name} (${v.label}) does not have enough stock`);
      total = total.add(v.price.mul(q));
    }
    const c = input.customer;
    return tx.order.create({
      data: {
        userId, customerName: c.name, customerPhone: c.phone, customerEmail: c.email,
        addressLine: c.addressLine, city: c.city, state: c.state, pincode: c.pincode, notes: input.notes, total,
        items: { create: variants.map((v) => ({
          variantId: v.id, productName: v.product.name, variantLabel: v.label, unitPrice: v.price, quantity: qty.get(v.id)!,
        })) },
      },
      include: { items: true },
    });
  });

  const text = buildMessage(order);
  const sent = await notifyOwner(text);
  await prisma.order.update({ where: { id: order.id }, data: { whatsapp: sent ? 'SENT' : 'FAILED' } });

  return { orderNumber: orderCode(order.number), total: Number(order.total), whatsappSent: sent, whatsappUrl: waLink(text) };
}

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

function buildMessage(o: OrderWithItems) {
  const lines = o.items.map((i) => `• ${clean(i.productName, 60)} (${clean(i.variantLabel, 20)}) x ${i.quantity} = ₹${Number(i.unitPrice) * i.quantity}`);
  return [
    `🛒 New order ${orderCode(o.number)}`,
    `Name: ${clean(o.customerName, 80)}`,
    `Phone: ${clean(o.customerPhone, 20)}`,
    o.customerEmail ? `Email: ${clean(o.customerEmail, 120)}` : null,
    `Address: ${clean(o.addressLine, 200)}, ${clean(o.city, 60)}, ${clean(o.state, 60)} - ${clean(o.pincode, 10)}`,
    '', ...lines, '',
    `Total: ₹${Number(o.total)} (Cash on delivery)`,
    o.notes ? `Notes: ${clean(o.notes, 300)}` : null,
  ].filter((l) => l !== null).join('\n');
}

export async function myOrders(userId: string) {
  const rows = await prisma.order.findMany({ where: { userId }, include: { items: true }, orderBy: { createdAt: 'desc' }, take: 50 });
  return rows.map((o) => ({
    orderNumber: orderCode(o.number), status: o.status, total: Number(o.total), createdAt: o.createdAt,
    items: o.items.map((i) => ({ name: i.productName, label: i.variantLabel, quantity: i.quantity, unitPrice: Number(i.unitPrice) })),
  }));
}

export async function adminOrders() {
  const rows = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return rows.map((o) => ({
    id: o.id,
    orderNumber: orderCode(o.number),
    customer: {
      name: o.customerName, phone: o.customerPhone, email: o.customerEmail,
      addressLine: o.addressLine, city: o.city, state: o.state, pincode: o.pincode,
    },
    notes: o.notes,
    status: o.status,
    total: Number(o.total),
    createdAt: o.createdAt,
    items: o.items.map((i) => ({
      name: i.productName, label: i.variantLabel, quantity: i.quantity, unitPrice: Number(i.unitPrice),
    })),
  }));
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new AppError(404, 'Order not found');
    if (order.status === status) return { status: order.status };
    if (order.status === 'CANCELLED') throw new AppError(409, 'A cancelled order cannot be changed');

    const allowed: Record<OrderStatus, OrderStatus[]> = {
      PLACED: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['DISPATCHED', 'CANCELLED'],
      DISPATCHED: ['DELIVERED'],
      DELIVERED: [],
      CANCELLED: [],
    };
    if (!allowed[order.status].includes(status)) {
      throw new AppError(409, `Cannot change an order from ${order.status} to ${status}`);
    }

    const changed = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status },
    });
    if (changed.count !== 1) throw new AppError(409, 'Order status changed. Refresh and try again');

    if (status === 'CANCELLED') {
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }
    return { status };
  });
}
