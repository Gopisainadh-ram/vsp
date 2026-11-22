import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errMsg } from '../core/models';

type Mode = 'login' | 'register' | 'verify';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="section container narrow">
      @if (auth.user(); as u) {
        <h1>Hi, {{ u.name }}</h1>
        <p>You are signed in. You can order, post reviews and chat with us.</p>
        <button class="btn ghost" (click)="auth.logout()">Sign out</button>
      } @else {
        <h1>{{ mode() === 'login' ? 'Sign in' : mode() === 'register' ? 'Create your account' : 'Verify your account' }}</h1>
        @if (msg()) { <div class="alert" [class.ok]="ok()" role="alert">{{ msg() }}</div> }

        @if (mode() === 'login') {
          <form class="panel" (ngSubmit)="login()" #f="ngForm">
            <label class="field">Email or phone <input name="id" [(ngModel)]="identifier" required autocomplete="username"></label>
            <label class="field">Password <input name="pw" type="password" [(ngModel)]="password" required autocomplete="current-password"></label>
            <button class="btn" [disabled]="f.invalid || busy()">Sign in</button>
          </form>
          <p>New here? <a href="#" (click)="go($event, 'register')">Create an account</a></p>
        } @else if (mode() === 'register') {
          <form class="panel" (ngSubmit)="register()" #f="ngForm">
            <label class="field">Your name <input name="n" [(ngModel)]="name" required minlength="2" maxlength="80" autocomplete="name"></label>
            <div class="grid-2">
              <label class="field">Email <input name="e" type="email" [(ngModel)]="email" autocomplete="email"></label>
              <label class="field">Phone <input name="p" type="tel" [(ngModel)]="phone" autocomplete="tel"></label>
            </div>
            <p class="muted small">Use either one. We send a 6-digit code to verify it.</p>
            <label class="field">Password <input name="pw" type="password" [(ngModel)]="password" required minlength="10" maxlength="128" autocomplete="new-password">
              <span class="muted small">At least 10 characters.</span></label>
            <button class="btn" [disabled]="f.invalid || (!email && !phone) || busy()">Create account</button>
          </form>
          <p>Already registered? <a href="#" (click)="go($event, 'login')">Sign in</a></p>
        } @else {
          <form class="panel" (ngSubmit)="verify()" #f="ngForm">
            <label class="field">6-digit code <input name="c" [(ngModel)]="code" required pattern="[0-9]{6}" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label>
            <button class="btn" [disabled]="f.invalid || busy()">Verify</button>
            <button type="button" class="btn ghost" (click)="resend()">Send a new code</button>
          </form>
        }
      }
    </section>
  `,
  styles: ['.narrow { max-width: 520px; } .small { font-size: .9rem; margin: 0; } .btn + .btn { margin-left: .5rem; }'],
})
export class AccountPage {
  auth = inject(AuthService);
  private router = inject(Router);
  mode = signal<Mode>('login');
  msg = signal(''); ok = signal(false); busy = signal(false);
  identifier = ''; password = ''; name = ''; email = ''; phone = ''; code = '';

  go(e: Event, m: Mode) { e.preventDefault(); this.msg.set(''); this.mode.set(m); }
  private fail(e: any) { this.ok.set(false); this.msg.set(errMsg(e)); this.busy.set(false); }

  async login() {
    this.busy.set(true); this.msg.set('');
    try { await this.auth.login(this.identifier, this.password); this.router.navigateByUrl('/'); }
    catch (e: any) {
      if (e?.error?.code === 'NOT_VERIFIED') { this.mode.set('verify'); this.ok.set(true); this.msg.set(e.error.message); this.busy.set(false); }
      else this.fail(e);
    }
  }
  async register() {
    this.busy.set(true); this.msg.set('');
    try {
      await this.auth.register({ name: this.name, password: this.password, ...(this.email ? { email: this.email } : {}), ...(this.phone ? { phone: this.phone } : {}) });
      this.identifier = this.email || this.phone; this.mode.set('verify'); this.ok.set(true);
      this.msg.set('We sent a 6-digit code. Enter it below to finish.'); this.busy.set(false);
    } catch (e) { this.fail(e); }
  }
  async verify() {
    this.busy.set(true);
    try { await this.auth.verify(this.identifier, this.code); this.router.navigateByUrl('/'); } catch (e) { this.fail(e); }
  }
  async resend() { try { await this.auth.resend(this.identifier); this.ok.set(true); this.msg.set('If your account needs verifying, a new code is on its way.'); } catch (e) { this.fail(e); } }
}
