import { Routes } from '@angular/router';
import { adminGuard } from './core/guards';

export const routes: Routes = [
  { path: '', title: 'VSP Cold Pressed Oils & Dry Fruits', loadComponent: () => import('./pages/home').then((m) => m.HomePage) },
  { path: 'about', title: 'About | VSP', loadComponent: () => import('./pages/about').then((m) => m.AboutPage) },
  { path: 'gallery', title: 'Gallery | VSP', loadComponent: () => import('./pages/gallery').then((m) => m.GalleryPage) },
  { path: 'reviews', title: 'Reviews | VSP', loadComponent: () => import('./pages/reviews').then((m) => m.ReviewsPage) },
  { path: 'contact', title: 'Contact | VSP', loadComponent: () => import('./pages/contact').then((m) => m.ContactPage) },
  { path: 'cart', title: 'Order & Cart | VSP', loadComponent: () => import('./pages/cart').then((m) => m.CartPage) },
  { path: 'account', title: 'Account | VSP', loadComponent: () => import('./pages/account').then((m) => m.AccountPage) },
  { path: 'admin', title: 'Owner dashboard | VSP', canActivate: [adminGuard], loadComponent: () => import('./pages/admin').then((m) => m.AdminPage) },
  { path: '**', redirectTo: '' },
];
