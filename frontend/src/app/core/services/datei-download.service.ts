import { DOCUMENT, inject, Injectable } from '@angular/core';

/**
 * Bietet clientseitig erzeugte Inhalte als Datei zum Herunterladen an (Blob + temporärer
 * `<a download>`). Es verlässt nichts den Browser des Admins – kein Upload, kein Backend.
 */
@Injectable({ providedIn: 'root' })
export class DateiDownloadService {
  private readonly document = inject(DOCUMENT);

  herunterladen(inhalt: string, dateiname: string, mimeTyp: string): void {
    const url = URL.createObjectURL(new Blob([inhalt], { type: mimeTyp }));
    const link = this.document.createElement('a');
    link.href = url;
    link.download = dateiname;
    link.style.display = 'none';
    this.document.body.appendChild(link);
    link.click();
    link.remove();
    // Erst nach dem Klick freigeben, sonst bricht der Download in manchen Browsern ab.
    setTimeout(() => {
      URL.revokeObjectURL(url);
    });
  }
}
