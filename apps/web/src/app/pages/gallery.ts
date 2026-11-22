import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { GalleryItem } from '../core/models';

@Component({
  selector: 'app-gallery',
  standalone: true,
  template: `
    <section class="section container">
      <h1>Gallery</h1>
      <p class="muted">A look at our press, our products and our kitchen-ready packs.</p>
      @if (loaded() && items().length === 0) { <p>Photos and videos are coming soon.</p> }
      <div class="grid">
        @for (g of items(); track g.id) {
          <figure class="panel tile">
            @if (g.type === 'IMAGE') { <img [src]="g.url" [alt]="g.caption || 'VSP photo'" loading="lazy"> }
            @else { <video [src]="g.url" controls preload="metadata"></video> }
            @if (g.caption) { <figcaption>{{ g.caption }}</figcaption> }
            @if (auth.isAdmin()) { <button class="btn small danger" (click)="remove(g)">Delete</button> }
          </figure>
        }
      </div>
    </section>
  `,
  styles: [`
    .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
    .tile { padding: .6rem; margin: 0; display: grid; gap: .5rem; }
    .tile img, .tile video { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 10px; background: #eef0e6; }
    figcaption { font-size: .95rem; }
  `],
})
export class GalleryPage implements OnInit {
  private http = inject(HttpClient);
  auth = inject(AuthService);
  items = signal<GalleryItem[]>([]);
  loaded = signal(false);
  ngOnInit() { this.http.get<GalleryItem[]>('/api/gallery').subscribe({ next: (i) => { this.items.set(i); this.loaded.set(true); }, error: () => this.loaded.set(true) }); }
  remove(g: GalleryItem) {
    if (!confirm('Delete this item from the gallery?')) return;
    this.http.delete(`/api/gallery/${g.id}`).subscribe(() => this.items.update((l) => l.filter((x) => x.id !== g.id)));
  }
}
