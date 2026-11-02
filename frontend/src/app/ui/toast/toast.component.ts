import { Component, input } from '@angular/core';

/** Was der Toast anzeigt. Strukturell gleich dem Toast aus dem ToastService (core). */
export interface ToastAnzeige {
  id: number;
  message: string;
  dismiss: () => void;
}

/**
 * Fehler-Toasts unten rechts (#322). Präsentational (#320): die Liste kommt per Input von der
 * App-Wurzel, die sie aus dem ToastService liest – ui/ kennt keine Services.
 */
@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  readonly toasts = input.required<readonly ToastAnzeige[]>();
}
