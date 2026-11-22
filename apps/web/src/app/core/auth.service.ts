import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { User } from './models';

interface Session { accessToken: string; user: User; }
const FLAG = 'vsp_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  // The access token lives only in memory (not localStorage), so XSS cannot read a long-lived secret.
  // The refresh token is an httpOnly cookie the browser JS can never see.
  readonly token = signal<string | null>(null);
  readonly user = signal<User | null>(null);
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');
  private refreshing?: Promise<boolean>;

  hasSession() { try { return localStorage.getItem(FLAG) === '1'; } catch { return false; } }
  private set(s: Session) {
    this.token.set(s.accessToken); this.user.set(s.user);
    try { localStorage.setItem(FLAG, '1'); } catch { /* storage unavailable */ }
  }

  restore() { return this.hasSession() ? this.refresh().then(() => undefined) : Promise.resolve(); }

  refresh(): Promise<boolean> {
    this.refreshing ??= firstValueFrom(this.http.post<Session>('/api/auth/refresh', {}))
      .then((s) => { this.set(s); return true; })
      .catch(() => { this.clear(); return false; })
      .finally(() => { this.refreshing = undefined; });
    return this.refreshing;
  }

  register(b: { name: string; email?: string; phone?: string; password: string }) { return firstValueFrom(this.http.post('/api/auth/register', b)); }
  resend(identifier: string) { return firstValueFrom(this.http.post('/api/auth/resend', { identifier })); }
  async verify(identifier: string, code: string) { this.set(await firstValueFrom(this.http.post<Session>('/api/auth/verify', { identifier, code }))); }
  async login(identifier: string, password: string) { this.set(await firstValueFrom(this.http.post<Session>('/api/auth/login', { identifier, password }))); }
  async logout() { await firstValueFrom(this.http.post('/api/auth/logout', {})).catch(() => undefined); this.clear(); }

  private clear() {
    this.token.set(null); this.user.set(null);
    try { localStorage.removeItem(FLAG); } catch { /* ignore */ }
  }
}
