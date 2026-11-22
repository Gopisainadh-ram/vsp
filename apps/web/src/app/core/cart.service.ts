import { Injectable, computed, inject, signal } from '@angular/core';
import { ProductService } from './product.service';
import { Product, Variant } from './models';

interface Line { variantId: string; qty: number; }
const KEY = 'vsp_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private products = inject(ProductService);
  private raw = signal<Line[]>(this.read());

  /** Cart stores only ids + quantities. Names and prices are always re-read from the catalogue. */
  readonly lines = computed(() => {
    const out: { product: Product; variant: Variant; qty: number }[] = [];
    for (const l of this.raw()) {
      for (const p of this.products.items()) {
        const v = p.variants.find((x) => x.id === l.variantId);
        if (v) out.push({ product: p, variant: v, qty: Math.min(l.qty, Math.max(v.stock, 1)) });
      }
    }
    return out;
  });
  readonly count = computed(() => this.raw().reduce((n, l) => n + l.qty, 0));
  readonly total = computed(() => this.lines().reduce((t, l) => t + l.variant.price * l.qty, 0));

  add(variantId: string) {
    const cur = this.raw();
    const hit = cur.find((l) => l.variantId === variantId);
    this.write(hit ? cur.map((l) => (l === hit ? { ...l, qty: Math.min(l.qty + 1, 50) } : l)) : [...cur, { variantId, qty: 1 }]);
  }
  setQty(variantId: string, qty: number) {
    this.write(qty < 1 ? this.raw().filter((l) => l.variantId !== variantId) : this.raw().map((l) => (l.variantId === variantId ? { ...l, qty: Math.min(qty, 50) } : l)));
  }
  clear() { this.write([]); }

  private write(v: Line[]) { this.raw.set(v); try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } }
  private read(): Line[] {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      return Array.isArray(v) ? v.filter((l) => typeof l?.variantId === 'string' && Number.isInteger(l?.qty) && l.qty > 0) : [];
    } catch { return []; }
  }
}
