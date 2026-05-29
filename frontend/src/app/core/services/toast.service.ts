import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  dismiss: () => void;
}

const DURATION_MS = 5000;
let nextId = 0;

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  show(message: string): void {
    const id = ++nextId;

    const dismiss = () => {
      this.toasts.update((all) => all.filter((t) => t.id !== id));
    };

    this.toasts.update((all) => [...all, { id, message, dismiss }]);

    setTimeout(dismiss, DURATION_MS);
  }
}
