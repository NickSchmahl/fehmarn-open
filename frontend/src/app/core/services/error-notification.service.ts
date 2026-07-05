import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from './toast.service';

export const ERROR_MESSAGES: Record<number, string> = {
  0: 'Keine Internetverbindung. Bitte prüfe deine Verbindung.',
  500: 'Etwas ist schiefgelaufen. Bitte versuche es später erneut.',
  503: 'Der Server ist momentan nicht erreichbar.',
};

const FALLBACK_MESSAGE = 'Ein unbekannter Fehler ist aufgetreten.';

@Injectable({ providedIn: 'root' })
export class ErrorNotificationService {
  private readonly toast = inject(ToastService);

  handle(error: HttpErrorResponse): void {
    const message = ERROR_MESSAGES[error.status] ?? FALLBACK_MESSAGE;
    this.log(error);
    this.toast.show(message);
  }

  private log(error: HttpErrorResponse): void {
    console.error('[ErrorNotificationService]', {
      status: error.status,
      message: error.message,
      url: error.url,
    });
    // TODO: RemoteLogger.capture(error)
  }
}
