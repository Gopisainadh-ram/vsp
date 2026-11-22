import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { ChatMsg, Conversation } from './models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private socket?: Socket;

  readonly mine = signal<ChatMsg[]>([]);            // customer's own thread
  readonly conversations = signal<Conversation[]>([]); // admin inbox
  readonly activeId = signal<string | null>(null);
  readonly thread = signal<ChatMsg[]>([]);          // admin's open thread
  readonly unread = signal(0);
  readonly connected = signal(false);

  connect() {
    if (this.socket) return;
    this.socket = io({ path: '/socket.io', auth: (cb) => cb({ token: this.auth.token() }) });
    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('chat:message', (m: ChatMsg) => this.onMessage(m));
    if (this.auth.isAdmin()) this.loadConversations(); else this.loadMine();
  }
  disconnect() {
    this.socket?.disconnect(); this.socket = undefined;
    this.mine.set([]); this.conversations.set([]); this.thread.set([]); this.activeId.set(null); this.unread.set(0);
  }

  loadMine() { this.http.get<ChatMsg[]>('/api/chat/me/messages').subscribe((m) => this.mine.set(m)); }
  loadConversations() { this.http.get<Conversation[]>('/api/chat/conversations').subscribe((c) => this.conversations.set(c)); }
  open(id: string) {
    this.activeId.set(id);
    this.http.get<ChatMsg[]>(`/api/chat/conversations/${id}/messages`).subscribe((m) => this.thread.set(m));
  }

  send(body: string): Promise<string | null> {
    return new Promise((resolve) => {
      const payload: { body: string; conversationId?: string } = { body };
      if (this.auth.isAdmin()) payload.conversationId = this.activeId() ?? undefined;
      this.socket?.emit('chat:send', payload, (r: { ok: boolean; error?: string }) => resolve(r.ok ? null : r.error ?? 'Not sent'));
      if (!this.socket) resolve('Not connected');
    });
  }

  private onMessage(m: ChatMsg) {
    if (this.auth.isAdmin()) {
      this.loadConversations();
      if (m.conversationId === this.activeId()) this.thread.update((t) => [...t, m]);
    } else {
      this.mine.update((t) => [...t, m]);
      if (m.fromAdmin) this.unread.update((n) => n + 1);
    }
  }
}
