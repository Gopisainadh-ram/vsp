import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BUSINESS } from '../business';
import { errMsg } from '../core/models';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="section container">
      <h1>Contact</h1>
      <div class="layout">
        <form class="panel" (ngSubmit)="send()" #f="ngForm">
          @if (msg()) { <div class="alert" [class.ok]="done()">{{ msg() }}</div> }
          <label class="field">Your name <input name="name" [(ngModel)]="m.name" required minlength="2" maxlength="80" autocomplete="name"></label>
          <div class="grid-2">
            <label class="field">Phone <input name="phone" type="tel" [(ngModel)]="m.phone" autocomplete="tel"></label>
            <label class="field">Email <input name="email" type="email" [(ngModel)]="m.email" autocomplete="email"></label>
          </div>
          <label class="field">Message <textarea name="message" rows="5" [(ngModel)]="m.message" required minlength="5" maxlength="2000"></textarea></label>
          <button class="btn" [disabled]="f.invalid || (!m.phone && !m.email) || sending()">Send message</button>
          <p class="muted small">Add a phone or email so we can reply.</p>
        </form>
        <aside class="panel">
          <h2>Talk to us</h2>
          <p>{{ b.phone }}<br>{{ b.email }}<br>{{ b.address }}</p>
          <a class="btn" [href]="wa" target="_blank" rel="noopener noreferrer">Message on WhatsApp</a>
        </aside>
      </div>
    </section>
  `,
  styles: ['.layout { display: grid; gap: 1.5rem; grid-template-columns: 1.4fr 1fr; align-items: start; } .small { font-size: .9rem; margin: .6rem 0 0; } @media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }'],
})
export class ContactPage {
  private http = inject(HttpClient);
  b = BUSINESS;
  wa = `https://wa.me/${BUSINESS.whatsapp}`;
  m = { name: '', phone: '', email: '', message: '' };
  msg = signal(''); done = signal(false); sending = signal(false);
  send() {
    this.sending.set(true);
    this.http.post<{ message: string }>('/api/contact', this.m).subscribe({
      next: (r) => { this.done.set(true); this.msg.set(r.message); this.m = { name: '', phone: '', email: '', message: '' }; this.sending.set(false); },
      error: (e) => { this.done.set(false); this.msg.set(errMsg(e)); this.sending.set(false); },
    });
  }
}
