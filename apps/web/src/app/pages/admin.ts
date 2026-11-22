import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../core/chat.service';
import { AdminOrder, GalleryItem, OrderStatus, Product, errMsg } from '../core/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule],
  template: `
    <section class="section container">
      <h1>Owner dashboard</h1>
      <div class="tabs" role="tablist">
        <button class="chip" role="tab" [class.on]="tab() === 'stock'" [attr.aria-selected]="tab() === 'stock'" (click)="tab.set('stock')">Products &amp; stock</button>
        <button class="chip" role="tab" [class.on]="tab() === 'orders'" [attr.aria-selected]="tab() === 'orders'" (click)="tab.set('orders'); loadOrders()">Orders</button>
        <button class="chip" role="tab" [class.on]="tab() === 'gallery'" [attr.aria-selected]="tab() === 'gallery'" (click)="tab.set('gallery')">Upload to gallery</button>
        <button class="chip" role="tab" [class.on]="tab() === 'chat'" [attr.aria-selected]="tab() === 'chat'" (click)="tab.set('chat'); chat.loadConversations()">Customer chats</button>
      </div>
      @if (msg()) { <div class="alert" [class.ok]="ok()" role="status">{{ msg() }}</div> }

      @if (tab() === 'stock') {
        <div class="panel scroll">
          <table>
            <thead><tr><th>Product</th><th>Size</th><th>Price (₹)</th><th>In stock</th><th></th></tr></thead>
            <tbody>
              @for (p of products(); track p.id) {
                @for (v of p.variants; track v.id) {
                  <tr>
                    <td>{{ p.name }}</td><td>{{ v.label }}</td>
                    <td><input class="num" type="number" min="0.01" step="0.01" [(ngModel)]="v.price" [name]="'p' + v.id" [attr.aria-label]="'Price for ' + p.name + ' ' + v.label"></td>
                    <td><input class="num" type="number" min="0" step="1" [(ngModel)]="v.stock" [name]="'s' + v.id" [attr.aria-label]="'Stock for ' + p.name + ' ' + v.label"></td>
                    <td><button class="btn small" (click)="save(v.id, v.stock, v.price)">Save</button></td>
                  </tr>
                }
              } @empty { <tr><td colspan="5" class="muted">No products yet. Add the products you have in stock below.</td></tr> }
            </tbody>
          </table>
        </div>
        <details class="panel product-form">
          <summary>Add a product and its available stock</summary>
          <form (ngSubmit)="createProduct()" #productForm="ngForm">
            <div class="grid-2">
              <label class="field">Product name
                <input name="productName" [(ngModel)]="draft.name" required minlength="2" maxlength="100">
              </label>
              <label class="field">Category
                <select name="productCategory" [(ngModel)]="draft.category">
                  <option value="OIL">Oil</option><option value="DRY_FRUIT">Dry fruit</option>
                </select>
              </label>
            </div>
            <label class="field">Description
              <textarea name="productDescription" [(ngModel)]="draft.description" required minlength="2" maxlength="500" rows="2"></textarea>
            </label>
            <label class="field">Product image URL (optional)
              <input name="imageUrl" type="url" [(ngModel)]="draft.imageUrl" maxlength="2048" placeholder="https://…">
            </label>
            <h3>Sizes, prices and current stock</h3>
            @for (v of draftVariants; track $index; let i = $index) {
              <div class="variant-row">
                <label class="field">Size
                  <input [name]="'newLabel' + i" [(ngModel)]="v.label" required maxlength="40" placeholder="e.g. 1 L">
                </label>
                <label class="field">Price (₹)
                  <input [name]="'newPrice' + i" type="number" min="0.01" step="0.01" [(ngModel)]="v.price" required>
                </label>
                <label class="field">In stock
                  <input [name]="'newStock' + i" type="number" min="0" step="1" [(ngModel)]="v.stock" required>
                </label>
                <button type="button" class="chip remove" (click)="removeVariant(i)" [disabled]="draftVariants.length === 1">Remove</button>
              </div>
            }
            <div class="form-actions">
              <button type="button" class="btn ghost" (click)="addVariant()" [disabled]="draftVariants.length >= 20">Add another size</button>
              <button class="btn" [disabled]="productForm.invalid || busy()">{{ busy() ? 'Saving…' : 'Add product' }}</button>
            </div>
          </form>
        </details>
      }

      @if (tab() === 'orders') {
        @if (ordersLoading()) { <p class="muted">Loading orders…</p> }
        <div class="orders">
          @for (o of orders(); track o.id) {
            <article class="panel order">
              <div class="order-head">
                <div><h2>{{ o.orderNumber }}</h2><p class="muted">{{ o.createdAt | date:'medium' }}</p></div>
                <label class="field">Status
                  <select [ngModel]="o.status" (ngModelChange)="updateOrderStatus(o, $event)" [disabled]="updatingOrder() === o.id" [attr.aria-label]="'Status for ' + o.orderNumber">
                    @for (status of availableStatuses(o.status); track status) {
                      <option [value]="status">{{ status }}</option>
                    }
                  </select>
                </label>
              </div>
              <p><b>{{ o.customer.name }}</b> · <a [href]="'tel:' + o.customer.phone">{{ o.customer.phone }}</a>
                @if (o.customer.email) { · <a [href]="'mailto:' + o.customer.email">{{ o.customer.email }}</a> }
              </p>
              <p class="muted">{{ o.customer.addressLine }}, {{ o.customer.city }}, {{ o.customer.state }} - {{ o.customer.pincode }}</p>
              <ul class="order-items">
                @for (item of o.items; track $index) {
                  <li>{{ item.name }} ({{ item.label }}) × {{ item.quantity }} — {{ item.unitPrice * item.quantity | currency:'INR':'symbol':'1.0-2' }}</li>
                }
              </ul>
              @if (o.notes) { <p><b>Customer note:</b> {{ o.notes }}</p> }
              <p class="order-total">Total: {{ o.total | currency:'INR':'symbol':'1.0-2' }} · Cash on delivery</p>
            </article>
          } @empty {
            @if (!ordersLoading()) { <div class="panel muted">No orders yet. New customer orders will appear here.</div> }
          }
        </div>
      }

      @if (tab() === 'gallery') {
        <form class="panel narrow" (ngSubmit)="upload()">
          <label class="field">Photo or video (JPG, PNG, WebP, MP4, WebM · up to 60 MB)
            <input type="file" name="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" (change)="pick($event)" required></label>
          <label class="field">Caption (optional) <input name="cap" [(ngModel)]="caption" maxlength="160"></label>
          <button class="btn" [disabled]="!file || busy()">{{ busy() ? 'Uploading…' : 'Upload' }}</button>
        </form>
        <p class="muted">To remove an item, open the Gallery tab while signed in as owner.</p>
      }

      @if (tab() === 'chat') {
        <div class="chat">
          <div class="panel list">
            @for (c of chat.conversations(); track c.id) {
              <button class="conv" [class.on]="chat.activeId() === c.id" (click)="chat.open(c.id)">
                <b>{{ c.user.name }}</b><span class="muted">{{ c.user.phone || c.user.email }}</span><small>{{ c.lastMessage }}</small>
              </button>
            } @empty { <p class="muted">No customer chats yet.</p> }
          </div>
          <div class="panel">
            @if (chat.activeId()) {
              <div class="log" role="log" aria-live="polite">
                @for (m of chat.thread(); track m.id) { <p [class.me]="m.fromAdmin">{{ m.body }}</p> }
              </div>
              <form class="row" (ngSubmit)="reply()">
                <label class="sr-only" for="reply">Reply</label>
                <input id="reply" name="r" [(ngModel)]="text" maxlength="1000" autocomplete="off" placeholder="Reply to customer">
                <button class="btn small" [disabled]="!text.trim()">Send</button>
              </form>
            } @else { <p class="muted">Choose a conversation to reply.</p> }
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .tabs { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1rem; } .narrow { max-width: 520px; }
    .scroll { overflow-x: auto; } table { width: 100%; border-collapse: collapse; min-width: 560px; }
    th, td { text-align: left; padding: .5rem .6rem; border-bottom: 1px solid var(--line); } input.num { width: 110px; }
    .product-form { margin-top: 1rem; } summary { cursor: pointer; font-weight: 700; }
    .product-form form { margin-top: 1rem; } .variant-row { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: .75rem; align-items: end; }
    .remove { margin-bottom: .15rem; } .form-actions { display: flex; justify-content: space-between; gap: .75rem; margin-top: 1rem; }
    .orders { display: grid; gap: 1rem; } .order-head { display: flex; justify-content: space-between; gap: 1rem; align-items: start; }
    .order-head h2, .order-head p { margin: 0; } .order-items { padding-left: 1.2rem; }
    .order-total { font-weight: 700; } .order a { color: var(--leaf); }
    .chat { display: grid; gap: 1rem; grid-template-columns: 300px 1fr; align-items: start; }
    .list { padding: .5rem; display: grid; gap: .3rem; max-height: 480px; overflow-y: auto; }
    .conv { display: grid; text-align: left; gap: .1rem; padding: .6rem; border: 1px solid transparent; background: none; border-radius: 10px; cursor: pointer; font: inherit; }
    .conv:hover, .conv.on { background: #eef0e6; border-color: var(--line); } .conv small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--muted); }
    .log { height: 340px; overflow-y: auto; display: flex; flex-direction: column; gap: .4rem; margin-bottom: .6rem; }
    .log p { margin: 0; padding: .45rem .75rem; border-radius: 12px; background: #eef0e6; max-width: 80%; overflow-wrap: anywhere; } .log p.me { background: var(--leaf); color: #fff; align-self: flex-end; }
    .row { display: flex; gap: .4rem; } .row input { flex: 1; font: inherit; padding: .5rem .7rem; border: 1.5px solid var(--line); border-radius: 10px; }
    @media (max-width: 800px) { .chat { grid-template-columns: 1fr; } .variant-row { grid-template-columns: 1fr 1fr; } }
  `],
})
export class AdminPage implements OnInit {
  private http = inject(HttpClient);
  chat = inject(ChatService);
  tab = signal<'stock' | 'orders' | 'gallery' | 'chat'>('stock');
  products = signal<Product[]>([]);
  orders = signal<AdminOrder[]>([]);
  ordersLoading = signal(false);
  updatingOrder = signal('');
  msg = signal(''); ok = signal(true); busy = signal(false);
  file: File | null = null; caption = ''; text = '';
  draft = { name: '', description: '', category: 'OIL' as 'OIL' | 'DRY_FRUIT', imageUrl: '' };
  draftVariants: { label: string; price: number; stock: number }[] = [{ label: '', price: 1, stock: 0 }];

  ngOnInit() {
    this.http.get<Product[]>('/api/admin/stock').subscribe({
      next: (p) => this.products.set(p),
      error: (e) => this.say(false, errMsg(e, 'Could not load products')),
    });
  }
  private say(ok: boolean, m: string) { this.ok.set(ok); this.msg.set(m); setTimeout(() => this.msg.set(''), 3500); }

  addVariant() {
    if (this.draftVariants.length < 20) this.draftVariants.push({ label: '', price: 1, stock: 0 });
  }
  removeVariant(index: number) {
    if (this.draftVariants.length > 1) this.draftVariants.splice(index, 1);
  }
  createProduct() {
    const labels = this.draftVariants.map((v) => v.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) { this.say(false, 'Each size must have a unique label'); return; }
    const payload = {
      ...this.draft,
      imageUrl: this.draft.imageUrl.trim() || undefined,
      variants: this.draftVariants.map((v) => ({ label: v.label.trim(), price: Number(v.price), stock: Number(v.stock) })),
    };
    this.busy.set(true);
    this.http.post<Product>('/api/admin/stock/products', payload).subscribe({
      next: (p) => {
        this.products.update((items) => [...items, p]);
        this.draft = { name: '', description: '', category: 'OIL', imageUrl: '' };
        this.draftVariants = [{ label: '', price: 1, stock: 0 }];
        this.busy.set(false);
        this.say(true, 'Product added with its current stock');
      },
      error: (e) => { this.busy.set(false); this.say(false, errMsg(e, 'Could not add product')); },
    });
  }
  loadOrders() {
    this.ordersLoading.set(true);
    this.http.get<AdminOrder[]>('/api/orders/admin').subscribe({
      next: (orders) => { this.orders.set(orders); this.ordersLoading.set(false); },
      error: (e) => { this.ordersLoading.set(false); this.say(false, errMsg(e, 'Could not load orders')); },
    });
  }
  availableStatuses(status: OrderStatus): OrderStatus[] {
    const next: Record<OrderStatus, OrderStatus[]> = {
      PLACED: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['DISPATCHED', 'CANCELLED'],
      DISPATCHED: ['DELIVERED'],
      DELIVERED: [],
      CANCELLED: [],
    };
    return [status, ...next[status]];
  }
  updateOrderStatus(order: AdminOrder, status: OrderStatus) {
    if (status === order.status) return;
    if (status === 'CANCELLED' && !window.confirm(`Cancel ${order.orderNumber}? Its items will be returned to stock.`)) {
      this.orders.update((items) => [...items]);
      return;
    }
    this.updatingOrder.set(order.id);
    this.http.patch<{ status: OrderStatus }>(`/api/orders/${order.id}/status`, { status }).subscribe({
      next: (result) => {
        this.orders.update((items) => items.map((item) => item.id === order.id ? { ...item, status: result.status } : item));
        this.updatingOrder.set('');
        this.say(true, `${order.orderNumber} updated to ${result.status}`);
      },
      error: (e) => { this.updatingOrder.set(''); this.say(false, errMsg(e)); this.loadOrders(); },
    });
  }
  save(id: string, stock: number, price: number) {
    this.http.patch(`/api/admin/stock/${id}`, { stock: Number(stock), price: Number(price) }).subscribe({
      next: () => this.say(true, 'Saved'), error: (e) => this.say(false, errMsg(e)),
    });
  }
  pick(e: Event) { this.file = (e.target as HTMLInputElement).files?.[0] ?? null; }
  upload() {
    if (!this.file) return;
    const fd = new FormData(); fd.append('file', this.file); if (this.caption.trim()) fd.append('caption', this.caption);
    this.busy.set(true);
    this.http.post<GalleryItem>('/api/gallery', fd).subscribe({
      next: () => { this.say(true, 'Uploaded to the gallery'); this.file = null; this.caption = ''; this.busy.set(false); },
      error: (e) => { this.say(false, errMsg(e, 'Upload failed')); this.busy.set(false); },
    });
  }
  async reply() { const t = this.text.trim(); if (!t) return; const err = await this.chat.send(t); if (err) this.say(false, err); else this.text = ''; }
}
