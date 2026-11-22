import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../core/cart.service';
import { Product, Variant } from '../core/models';
import { ProductService } from '../core/product.service';
import { PackComponent } from '../shared/pack';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, PackComponent, RouterLink],
  template: `
    <section class="hero">
      <div class="container hero-in">
        <div>
          <h1>Cold pressed oils, straight from the press to your kitchen.</h1>
          <p class="lead">Groundnut, sesame, coconut and sunflower oils, plus fresh dry fruits. Order online and pay when it arrives.</p>
          <a class="btn" href="#shop">Shop now</a>
          <a class="btn ghost" routerLink="/about">Our story</a>
        </div>
        <div class="shelf" aria-hidden="true">
          <app-pack kind="OIL" name="Groundnut" /><app-pack kind="OIL" name="Sesame" /><app-pack kind="OIL" name="Coconut" />
        </div>
      </div>
    </section>

    <section id="shop" class="section container">
      <h2>Shop</h2>
      <div class="filters" role="group" aria-label="Filter products">
        <button class="chip" [class.on]="filter() === 'ALL'" (click)="filter.set('ALL')">All</button>
        <button class="chip" [class.on]="filter() === 'OIL'" (click)="filter.set('OIL')">Oils</button>
        <button class="chip" [class.on]="filter() === 'DRY_FRUIT'" (click)="filter.set('DRY_FRUIT')">Dry fruits</button>
        <label class="field search">Search products
          <input type="search" [ngModel]="query()" (ngModelChange)="query.set($event)" placeholder="Name or description">
        </label>
        <label class="field sort">Sort by
          <select [ngModel]="sort()" (ngModelChange)="sort.set($event)">
            <option value="featured">Featured</option>
            <option value="name">Name</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </label>
        <label class="availability"><input type="checkbox" [ngModel]="inStockOnly()" (ngModelChange)="inStockOnly.set($event)"> In stock only</label>
      </div>
      <p class="toast" role="status">{{ added() }}</p>
      @if (products.failed()) { <div class="alert">We could not load products. Please refresh the page.</div> }
      @if (products.loaded() && !products.failed() && shown().length === 0) { <p class="muted">No products match these preferences.</p> }
      <div class="grid">
        @for (p of shown(); track p.id) {
          <article class="panel card">
            <div class="pic">
              @if (p.imageUrl) {
                <img [src]="p.imageUrl" [alt]="p.name" loading="lazy">
              } @else {
                <app-pack [kind]="p.category" [name]="p.name" />
              }
            </div>
            <h3>{{ p.name }}</h3>
            <p class="muted small">{{ p.description }}</p>
            <div class="sizes" role="group" [attr.aria-label]="p.name + ' sizes'">
              @for (v of p.variants; track v.id) {
                <button class="chip" [class.on]="pick(p).id === v.id" [disabled]="v.stock < 1" (click)="selected[p.id] = v.id">{{ v.label }}</button>
              }
            </div>
            <div class="buy">
              <div>
                <b class="price">{{ pick(p).price | currency: 'INR' : 'symbol' : '1.0-0' }}</b>
                <span class="stock" [class.low]="pick(p).stock > 0 && pick(p).stock <= 5">{{ stockText(pick(p)) }}</span>
              </div>
              <button class="btn small" [disabled]="pick(p).stock < 1" (click)="add(p)">Add to cart</button>
            </div>
          </article>
        }
      </div>
    </section>
  `,
  styles: [`
    .hero { background: var(--leaf); color: #fff; padding: 3.5rem 0 2.5rem; }
    .hero-in { display: grid; gap: 2rem; grid-template-columns: 1.2fr 1fr; align-items: center; }
    .hero h1 { max-width: 16ch; } .lead { font-size: 1.2rem; color: #e1ece5; }
    .hero .btn { background: var(--gold); border-color: var(--gold); color: var(--ink); margin-right: .5rem; }
    .hero .btn.ghost { background: transparent; color: #fff; border-color: #fff; }
    .shelf { display: flex; align-items: flex-end; gap: .5rem; height: 260px; }
    .shelf app-pack { flex: 1; } .shelf app-pack:nth-child(2) { height: 100%; } .shelf app-pack:not(:nth-child(2)) { height: 82%; }
    .filters { display: flex; align-items: end; flex-wrap: wrap; gap: .5rem; margin: 1rem 0; }
    .search { min-width: 220px; flex: 1; } .sort { min-width: 190px; }
    .availability { display: inline-flex; align-items: center; gap: .4rem; min-height: 42px; }
    .toast { min-height: 1.6rem; color: var(--leaf); font-weight: 600; margin: 0 0 .5rem; }
    .grid { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
    .card { display: flex; flex-direction: column; gap: .5rem; }
    .pic { height: 150px; background: #eef0e6; border-radius: 10px; padding: .6rem; display: grid; place-items: center; overflow: hidden; }
    .pic app-pack { height: 100%; width: 90px; }
    .pic img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
    .small { font-size: .95rem; margin: 0; flex: 1; }
    .sizes { display: flex; flex-wrap: wrap; gap: .4rem; } .chip:disabled { opacity: .45; text-decoration: line-through; cursor: not-allowed; }
    .buy { display: flex; justify-content: space-between; align-items: center; gap: .5rem; margin-top: .4rem; }
    .price { font: 700 1.4rem var(--display); display: block; line-height: 1.1; }
    .stock { font-size: .85rem; color: var(--muted); } .stock.low { color: var(--chilli); font-weight: 600; }
    @media (max-width: 760px) { .hero-in { grid-template-columns: 1fr; } .shelf { height: 180px; } }
  `],
})
export class HomePage implements OnInit {
  products = inject(ProductService);
  private cart = inject(CartService);
  filter = signal<'ALL' | 'OIL' | 'DRY_FRUIT'>('ALL');
  query = signal('');
  sort = signal<'featured' | 'name' | 'price-low' | 'price-high'>('featured');
  inStockOnly = signal(false);
  added = signal('');
  selected: Record<string, string> = {};
  shown = computed(() => {
    const query = this.query().trim().toLowerCase();
    const items = this.products.items().filter((p) =>
      (this.filter() === 'ALL' || p.category === this.filter()) &&
      (!query || `${p.name} ${p.description}`.toLowerCase().includes(query)) &&
      (!this.inStockOnly() || p.variants.some((v) => v.stock > 0)),
    );
    const price = (p: Product) => Math.min(...p.variants.map((v) => v.price));
    if (this.sort() === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
    if (this.sort() === 'price-low') items.sort((a, b) => price(a) - price(b));
    if (this.sort() === 'price-high') items.sort((a, b) => price(b) - price(a));
    return items;
  });

  ngOnInit() { this.products.load(); }
  pick(p: Product): Variant { return p.variants.find((v) => v.id === this.selected[p.id]) ?? p.variants.find((v) => v.stock > 0) ?? p.variants[0]; }
  stockText(v: Variant) { return v.stock < 1 ? 'Out of stock' : v.stock <= 5 ? `Only ${v.stock} left` : 'In stock'; }
  add(p: Product) {
    const v = this.pick(p); if (v.stock < 1) return;
    this.cart.add(v.id);
    this.added.set(`${p.name} (${v.label}) added to your cart`);
    setTimeout(() => this.added.set(''), 2200);
  }
}
