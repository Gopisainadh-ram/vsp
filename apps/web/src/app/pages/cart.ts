import { CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CartService } from '../core/cart.service';
import { errMsg } from '../core/models';
import { ProductService } from '../core/product.service';

interface Result { orderNumber: string; total: number; whatsappSent: boolean; whatsappUrl: string; }

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, RouterLink],
  template: `
    <section class="section container">
      <h1>Order / Cart</h1>

      @if (result(); as r) {
        <div class="panel done">
          <h2>Order {{ r.orderNumber }} placed</h2>
          <p>Thank you! Total {{ r.total | currency: 'INR' : 'symbol' : '1.0-0' }}, payable on delivery. We will confirm your order on the phone number you gave.</p>
          @if (!r.whatsappSent) {
            <p>Tap below to also send your order to us on WhatsApp. It speeds up confirmation.</p>
            <a class="btn" [href]="r.whatsappUrl" target="_blank" rel="noopener noreferrer">Send order on WhatsApp</a>
          }
          <a class="btn ghost" routerLink="/">Keep shopping</a>
        </div>
      } @else if (cart.lines().length === 0) {
        <div class="panel"><p>Your cart is empty.</p><a class="btn" routerLink="/">Browse products</a></div>
      } @else {
        <div class="layout">
          <div class="panel">
            <h2>Your items</h2>
            @for (l of cart.lines(); track l.variant.id) {
              <div class="line">
                <div><b>{{ l.product.name }}</b><br><span class="muted">{{ l.variant.label }} · {{ l.variant.price | currency: 'INR' : 'symbol' : '1.0-0' }}</span>
                  @if (l.variant.stock < 1) { <br><span class="warn">Out of stock. Please remove it.</span> }
                </div>
                <div class="qty">
                  <button class="chip" (click)="cart.setQty(l.variant.id, l.qty - 1)" [attr.aria-label]="'Decrease ' + l.product.name">−</button>
                  <output>{{ l.qty }}</output>
                  <button class="chip" (click)="cart.setQty(l.variant.id, l.qty + 1)" [disabled]="l.qty >= l.variant.stock" [attr.aria-label]="'Increase ' + l.product.name">+</button>
                </div>
                <b>{{ l.variant.price * l.qty | currency: 'INR' : 'symbol' : '1.0-0' }}</b>
              </div>
            }
            <p class="total">Total <b>{{ cart.total() | currency: 'INR' : 'symbol' : '1.0-0' }}</b> · pay on delivery</p>
          </div>

          <form class="panel" (ngSubmit)="place()" #f="ngForm">
            <h2>Delivery details</h2>
            @if (!auth.user()) { <p class="muted">Ordering as a guest. <a routerLink="/account">Sign in</a> to save time next order.</p> }
            @if (error()) { <div class="alert" role="alert">{{ error() }}</div> }
            <label class="field">Full name <input name="name" [(ngModel)]="c.name" required minlength="2" maxlength="80" autocomplete="name"></label>
            <div class="grid-2">
              <label class="field">Phone <input name="phone" type="tel" [(ngModel)]="c.phone" required autocomplete="tel"></label>
              <label class="field">Email (optional) <input name="email" type="email" [(ngModel)]="c.email" autocomplete="email"></label>
            </div>
            <label class="field">Address <input name="addressLine" [(ngModel)]="c.addressLine" required minlength="5" maxlength="200" autocomplete="street-address"></label>
            <div class="grid-2">
              <label class="field">City <input name="city" [(ngModel)]="c.city" required maxlength="60" autocomplete="address-level2"></label>
              <label class="field">State <input name="state" [(ngModel)]="c.state" required maxlength="60" autocomplete="address-level1"></label>
            </div>
            <label class="field">Pincode <input name="pincode" [(ngModel)]="c.pincode" required pattern="[0-9]{6}" inputmode="numeric" maxlength="6" autocomplete="postal-code"></label>
            <label class="field">Notes (optional) <textarea name="notes" rows="2" [(ngModel)]="notes" maxlength="300"></textarea></label>
            <button class="btn" [disabled]="f.invalid || placing()">{{ placing() ? 'Placing order…' : 'Place order' }}</button>
          </form>
        </div>
      }
    </section>
  `,
  styles: [`
    .layout { display: grid; gap: 1.5rem; grid-template-columns: 1.1fr 1fr; align-items: start; }
    .line { display: grid; grid-template-columns: 1fr auto 80px; gap: .75rem; align-items: center; padding: .7rem 0; border-bottom: 1px solid var(--line); }
    .qty { display: flex; align-items: center; gap: .4rem; } output { min-width: 1.6rem; text-align: center; font-weight: 600; }
    .total { font-size: 1.25rem; margin: 1rem 0 0; } .warn { color: var(--chilli); font-size: .9rem; }
    .done .btn { margin-right: .5rem; }
    @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
  `],
})
export class CartPage implements OnInit {
  private http = inject(HttpClient);
  private products = inject(ProductService);
  auth = inject(AuthService);
  cart = inject(CartService);
  c = { name: '', phone: '', email: '', addressLine: '', city: '', state: 'Andhra Pradesh', pincode: '' };
  notes = '';
  placing = signal(false); error = signal(''); result = signal<Result | null>(null);

  ngOnInit() {
    this.products.load(); // always show current price and stock
    const u = this.auth.user();
    if (u) { this.c.name = u.name; this.c.phone = u.phone ?? ''; this.c.email = u.email ?? ''; }
  }

  place() {
    this.error.set('');
    const items = this.cart.lines().filter((l) => l.variant.stock > 0).map((l) => ({ variantId: l.variant.id, quantity: l.qty }));
    if (!items.length) { this.error.set('Your cart has no available items.'); return; }
    this.placing.set(true);
    this.http.post<Result>('/api/orders', { customer: this.c, items, ...(this.notes.trim() ? { notes: this.notes } : {}) }).subscribe({
      next: (r) => { this.result.set(r); this.cart.clear(); this.placing.set(false); this.products.load(); },
      error: (e) => { this.error.set(errMsg(e)); this.placing.set(false); this.products.load(); },
    });
  }
}
