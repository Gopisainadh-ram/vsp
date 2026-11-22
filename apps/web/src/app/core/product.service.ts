import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Product } from './models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  readonly items = signal<Product[]>([]);
  readonly loaded = signal(false);
  readonly failed = signal(false);

  load() {
    this.http.get<Product[]>('/api/products').subscribe({
      next: (p) => { this.items.set(p); this.loaded.set(true); this.failed.set(false); },
      error: () => { this.failed.set(true); this.loaded.set(true); },
    });
  }
}
