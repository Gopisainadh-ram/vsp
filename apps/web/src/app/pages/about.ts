import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="section container">
      <h1>About VSP</h1>
      <p>VSP presses oil in small batches using the cold press method, where seeds and nuts are crushed slowly without added heat or chemical solvents. We pair our oils with a range of dry fruits, sorted and packed for freshness.</p>
      <h2>What you can expect</h2>
      <p>Small batches, honest labels and clear prices. Stock is updated by the owner, so what you see on the shop page is what we have today.</p>
      <h2>How ordering works</h2>
      <p>Add items to your cart and place the order with your name, phone and delivery address. You can order as a guest or with an account. We receive your order on WhatsApp and confirm it with you. Payment is on delivery.</p>
      <p><a class="btn" routerLink="/">Browse products</a> <a class="btn ghost" routerLink="/contact">Contact us</a></p>
    </section>
  `,
})
export class AboutPage {}
