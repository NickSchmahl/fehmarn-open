import { DOCUMENT, inject, Injectable } from '@angular/core';

/** Wartezeit bis zur Freigabe der Object-URL (FileSaver.js nutzt ähnlich 40 s). */
const FREIGABE_NACH_MS = 60_000;

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
    // Großzügig verzögert freigeben: Safari/WebKit startet den Download erst asynchron nach dem
    // Klick, eine sofortige Freigabe ergäbe eine leere oder abgebrochene Datei.
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, FREIGABE_NACH_MS);
  }
}
