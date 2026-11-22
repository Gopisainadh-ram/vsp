import { Component, effect, inject } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AuthService } from "./core/auth.service";
import { CartService } from "./core/cart.service";
import { ChatService } from "./core/chat.service";
import { ChatWidget } from "./layout/chat-widget";
import { BUSINESS } from "./business";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ChatWidget],
  template: `
    <a class="skip" href="#main">Skip to content</a>
    <header class="bar">
      <div class="container bar-in">
        <a routerLink="/" class="brand" aria-label="VSP home">
          <span class="mark" aria-hidden="true"></span>
          <span
            ><b>VSP</b><small>Cold pressed oils &amp; dry fruits</small></span
          >
        </a>
        <nav aria-label="Main" class="tabs">
          <a
            routerLink="/"
            routerLinkActive="on"
            [routerLinkActiveOptions]="{ exact: true }"
            >Home</a
          >
          <a routerLink="/about" routerLinkActive="on">About</a>
          <a routerLink="/gallery" routerLinkActive="on">Gallery</a>
          <a routerLink="/reviews" routerLinkActive="on">Reviews</a>
          <a routerLink="/contact" routerLinkActive="on">Contact</a>
          <a routerLink="/cart" routerLinkActive="on" class="cart"
            >Order / Cart
            @if (cart.count() > 0) {
              <span class="badge" [attr.aria-label]="cart.count() + ' items'">
                {{ cart.count() }}
              </span>
            }
          </a>
        </nav>
        <div class="acct">
          @if (auth.user(); as u) {
            @if (auth.isAdmin()) {
              <a routerLink="/admin" class="btn small ghost">Owner</a>
            }
            <button class="btn small ghost" (click)="logout()">Sign out</button>
          } @else {
            <a routerLink="/account" class="btn small">Sign in</a>
          }
        </div>
      </div>
    </header>
    <main id="main"><router-outlet /></main>
    <footer>
      <div class="container foot">
        <div>
          <b>{{ b.name }}</b
          ><br /><span>{{ b.site }}</span>
        </div>
        <div>{{ b.phone }}<br />{{ b.email }}</div>
        <div>{{ b.address }}<br />{{ b.fssai }}</div>
      </div>
    </footer>
    <app-chat-widget />
  `,
  styles: [
    `
      .skip {
        position: absolute;
        left: -999px;
      }
      .skip:focus {
        left: 1rem;
        top: 1rem;
        background: #fff;
        padding: 0.5rem 1rem;
        z-index: 99;
      }
      .bar {
        background: #fff;
        border-bottom: 1px solid var(--line);
        position: sticky;
        top: 0;
        z-index: 20;
      }
      .bar-in {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem 1.25rem;
        padding: 0.6rem 0;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        text-decoration: none;
        color: var(--ink);
        line-height: 1.1;
      }
      .brand b {
        font: 700 1.5rem var(--display);
        display: block;
      }
      .brand small {
        font-size: 0.78rem;
        color: var(--muted);
      }
      .mark {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        background: var(--leaf);
        position: relative;
      }
      .mark::after {
        content: "";
        position: absolute;
        inset: 7px 9px;
        background: var(--gold);
        border-radius: 50% 50% 50% 50% / 70% 70% 30% 30%;
      }
      .tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        margin-left: auto;
      }
      .tabs a {
        padding: 0.45rem 0.8rem;
        border-radius: 999px;
        text-decoration: none;
        color: var(--ink);
        font-weight: 500;
        min-height: 40px;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }
      .tabs a:hover {
        background: rgba(31, 77, 58, 0.08);
      }
      .tabs a.on {
        background: var(--ink);
        color: #fff;
      }
      .badge {
        background: var(--gold);
        color: var(--ink);
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 700;
        padding: 0 0.45rem;
        min-width: 1.4rem;
        text-align: center;
      }
      .acct {
        display: flex;
        gap: 0.4rem;
      }
      footer {
        background: var(--ink);
        color: #e6e6dc;
        padding: 2rem 0;
        margin-top: 3rem;
        font-size: 0.95rem;
      }
      .foot {
        display: grid;
        gap: 1.5rem;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      main {
        min-height: 60vh;
      }
    `,
  ],
})
export class App {
  auth = inject(AuthService);
  cart = inject(CartService);
  b = BUSINESS;
  private chat = inject(ChatService);

  constructor() {
    // Chat is for registered users only: connect when signed in, disconnect on sign-out.
    effect(
      () => {
        if (this.auth.user()) this.chat.connect();
        else this.chat.disconnect();
      },
      { allowSignalWrites: true },
    );
  }
  logout() {
    this.auth.logout();
  }
}
