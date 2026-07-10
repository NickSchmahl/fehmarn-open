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
        d="M8 32C8 20 20 10 34 10C46 10 58 18 58 28C58 36 52 42 44 40C40 39 38 44 34 48C24 52 12 46 8 36Z"
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
