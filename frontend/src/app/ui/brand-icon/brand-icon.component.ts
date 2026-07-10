import { Component } from '@angular/core';

// Geteilte Bildmarke: stilisierte Fehmarn-Silhouette mit Bullseye-Punkt (Darts-Bezug).
// Rein dekorativ (aria-hidden); Größe steuert der Einbettungskontext per CSS.
@Component({
  selector: 'app-brand-icon',
  standalone: true,
  template: `
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        class="brand-icon__island"
        d="M8 34C6 26 14 20 22 19C30 18 34 12 42 13C52 14 58 22 56 30C55 37 48 41 44 45C39 50 34 52 26 51C17 50 10 43 8 34Z"
        fill="currentColor"
      />
      <circle
        class="brand-icon__ring"
        cx="34"
        cy="33"
        r="8"
        fill="none"
        stroke="var(--accent)"
        stroke-width="2"
      />
      <circle class="brand-icon__bullseye" cx="34" cy="33" r="3.5" fill="var(--accent)" />
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        width: 100%;
        height: 100%;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class BrandIconComponent {}
