import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Review, errMsg } from '../core/models';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  template: `
    <section class="section container">
      <h1>Reviews</h1>
      @if (data().count > 0) { <p class="avg"><b>{{ data().average }}</b> out of 5 from {{ data().count }} review{{ data().count === 1 ? '' : 's' }}</p> }
      <div class="layout">
        <div>
          @for (r of data().items; track r.id) {
            <article class="panel rev">
              <div class="stars" [attr.aria-label]="r.rating + ' out of 5 stars'">{{ '★'.repeat(r.rating) }}<span>{{ '★'.repeat(5 - r.rating) }}</span></div>
              <p>{{ r.comment }}</p>
              <small class="muted">{{ r.name }} · {{ r.createdAt | date: 'mediumDate' }}</small>
            </article>
          } @empty { <p>No reviews yet. Be the first to share how we did.</p> }
        </div>
        <aside class="panel">
          <h2>Write a review</h2>
          @if (auth.user()) {
            <form (ngSubmit)="submit()" #f="ngForm">
              @if (msg()) { <div class="alert" [class.ok]="done()">{{ msg() }}</div> }
              <fieldset class="field"><legend>Your rating</legend>
                <div class="pick">@for (n of [1,2,3,4,5]; track n) { <button type="button" class="chip" [class.on]="rating === n" (click)="rating = n" [attr.aria-label]="n + ' stars'">{{ n }}★</button> }</div>
              </fieldset>
              <label class="field">Your review
                <textarea name="comment" rows="4" [(ngModel)]="comment" required minlength="3" maxlength="1000"></textarea>
              </label>
              <button class="btn" [disabled]="f.invalid || !rating">Post review</button>
            </form>
          } @else {
            <p>Reviews are for registered customers. <a routerLink="/account">Sign in or create an account</a>.</p>
          }
        </aside>
      </div>
    </section>
  `,
  styles: [`
    .layout { display: grid; gap: 1.5rem; grid-template-columns: 1.4fr 1fr; align-items: start; } .avg { font-size: 1.2rem; }
    .rev { margin-bottom: 1rem; } .rev p { margin: .3rem 0; overflow-wrap: anywhere; }
    .stars { color: var(--gold); font-size: 1.2rem; letter-spacing: 2px; } .stars span { color: var(--line); }
    fieldset { border: 0; padding: 0; margin: 0 0 1rem; } .pick { display: flex; gap: .3rem; flex-wrap: wrap; }
    @media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }
  `],
})
export class ReviewsPage implements OnInit {
  private http = inject(HttpClient);
  auth = inject(AuthService);
  data = signal<{ average: number | null; count: number; items: Review[] }>({ average: null, count: 0, items: [] });
  rating = 0; comment = '';
  msg = signal(''); done = signal(false);
  ngOnInit() { this.load(); }
  load() { this.http.get<any>('/api/reviews').subscribe((d) => this.data.set(d)); }
  submit() {
    this.http.post('/api/reviews', { rating: this.rating, comment: this.comment }).subscribe({
      next: () => { this.done.set(true); this.msg.set('Thank you! Your review is live.'); this.comment = ''; this.rating = 0; this.load(); },
      error: (e) => { this.done.set(false); this.msg.set(errMsg(e)); },
    });
  }
}
