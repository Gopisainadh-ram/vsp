import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ChatService } from '../core/chat.service';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    @if (!auth.isAdmin()) {
      <button class="fab btn" (click)="toggle()" [attr.aria-expanded]="open()" aria-controls="chat-panel">
        Chat with us @if (chat.unread() > 0 && !open()) { <span class="dot">{{ chat.unread() }}</span> }
      </button>
      @if (open()) {
        <section id="chat-panel" class="panel box" aria-label="Chat with VSP">
          <h2>Chat with VSP</h2>
          @if (auth.user()) {
            <div class="log" #log role="log" aria-live="polite">
              @for (m of chat.mine(); track m.id) {
                <p [class.me]="!m.fromAdmin">{{ m.body }}</p>
              } @empty { <p class="muted">Ask us about products, stock or your order.</p> }
            </div>
            @if (error()) { <div class="alert">{{ error() }}</div> }
            <form (ngSubmit)="send()" class="row">
              <label class="sr-only" for="chat-in">Message</label>
              <input id="chat-in" name="m" [(ngModel)]="text" maxlength="1000" autocomplete="off" placeholder="Type a message">
              <button class="btn small" [disabled]="!text.trim() || !chat.connected()">Send</button>
            </form>
          } @else {
            <p>Chat is for registered customers. <a routerLink="/account" (click)="open.set(false)">Sign in or create an account</a> to message us.</p>
          }
        </section>
      }
    }
  `,
  styles: [`
    .fab { position: fixed; right: 1rem; bottom: 1rem; z-index: 30; box-shadow: 0 6px 18px rgba(0,0,0,.2); }
    .dot { background: var(--gold); color: var(--ink); border-radius: 999px; padding: 0 .45rem; font-size: .8rem; font-weight: 700; }
    .box { position: fixed; right: 1rem; bottom: 4.5rem; z-index: 30; width: min(360px, calc(100vw - 2rem)); box-shadow: 0 10px 30px rgba(0,0,0,.2); }
    h2 { font-size: 1.15rem; }
    .log { height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: .4rem; margin-bottom: .6rem; }
    .log p { margin: 0; padding: .45rem .75rem; border-radius: 12px; background: #eef0e6; max-width: 85%; overflow-wrap: anywhere; }
    .log p.me { background: var(--leaf); color: #fff; align-self: flex-end; }
    .row { display: flex; gap: .4rem; } .row input { flex: 1; font: inherit; padding: .5rem .7rem; border: 1.5px solid var(--line); border-radius: 10px; }
  `],
})
export class ChatWidget {
  auth = inject(AuthService);
  chat = inject(ChatService);
  open = signal(false);
  error = signal('');
  text = '';
  log = viewChild<ElementRef<HTMLElement>>('log');

  constructor() {
    effect(() => { this.chat.mine(); queueMicrotask(() => { const el = this.log()?.nativeElement; if (el) el.scrollTop = el.scrollHeight; }); });
  }
  toggle() { this.open.update((o) => !o); if (this.open()) this.chat.unread.set(0); }
  async send() {
    const body = this.text.trim(); if (!body) return;
    const err = await this.chat.send(body);
    this.error.set(err ?? ''); if (!err) this.text = '';
  }
}
