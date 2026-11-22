import { Component, computed, input } from '@angular/core';

const TONES: [RegExp, string][] = [
  [/groundnut/i, '#e3a82b'], [/sesame|gingelly/i, '#b8701f'], [/coconut/i, '#efe7bd'], [/sunflower/i, '#f0c419'],
  [/cashew/i, '#e8d3a2'], [/almond/i, '#b98f5f'], [/raisin/i, '#5b3a4d'], [/date/i, '#5a3420'],
];

// Drawn in SVG so the shop looks complete before any product photos exist.
@Component({
  selector: 'app-pack',
  standalone: true,
  template: `
    @if (kind() === 'OIL') {
      <svg viewBox="0 0 120 160" role="img" [attr.aria-label]="name() + ' bottle'">
        <rect x="46" y="6" width="28" height="16" rx="3" fill="#1c1a16"/>
        <path d="M48 22h24v16c0 8 18 14 18 30v70a10 10 0 0 1-10 10H40a10 10 0 0 1-10-10V68c0-16 18-22 18-30z" [attr.fill]="tone()" stroke="#1c1a16" stroke-opacity=".25"/>
        <rect x="36" y="82" width="48" height="40" rx="5" fill="#fff" fill-opacity=".92"/>
        <text x="60" y="100" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="700" font-size="13" fill="#1f4d3a">VSP</text>
        <text x="60" y="114" text-anchor="middle" font-size="7" fill="#5d5a52">COLD PRESSED</text>
      </svg>
    } @else {
      <svg viewBox="0 0 120 160" role="img" [attr.aria-label]="name() + ' pack'">
        <path d="M24 26h72l6 120a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6z" fill="#f2efe4" stroke="#1c1a16" stroke-opacity=".25"/>
        <path d="M24 26h72l1 14H23z" [attr.fill]="tone()"/>
        <circle cx="60" cy="92" r="26" [attr.fill]="tone()" fill-opacity=".9"/>
        <text x="60" y="97" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="700" font-size="14" fill="#fff">VSP</text>
      </svg>
    }
  `,
  styles: [':host { display: block; } svg { width: 100%; height: 100%; display: block; }'],
})
export class PackComponent {
  kind = input<'OIL' | 'DRY_FRUIT'>('OIL');
  name = input('');
  tone = computed(() => TONES.find(([r]) => r.test(this.name()))?.[1] ?? '#c9a24a');
}
