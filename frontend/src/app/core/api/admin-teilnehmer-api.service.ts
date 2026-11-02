import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { AdminUebersicht } from '@shared/admin-uebersicht';

/**
 * Admin-Endpunkte rund um die Meldungen (#318): Übersicht (Teilnehmerverwaltung und Export) und
 * die Zeilen-Aktionen der Teilnehmerverwaltung. Der Bearer-Token kommt vom authInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class AdminTeilnehmerApiService {
  private readonly http = inject(HttpClient);

  ladeUebersicht(): Observable<AdminUebersicht> {
    return this.http.get<AdminUebersicht>('/api/admin/teilnehmer');
  }

  abmelden(meldungId: number): Observable<void> {
    return this.http
      .post(`/api/admin/anmeldung/${String(meldungId)}/abmelden`, {})
      .pipe(map(() => void 0));
  }

  reaktivieren(meldungId: number): Observable<void> {
    return this.http
      .post(`/api/admin/anmeldung/${String(meldungId)}/reaktivieren`, {})
      .pipe(map(() => void 0));
  }

  setzeAnwesenheit(meldungId: number, anwesend: boolean): Observable<void> {
    return this.http
      .put(`/api/admin/anmeldung/${String(meldungId)}/anwesenheit`, { anwesend })
      .pipe(map(() => void 0));
  }
}
