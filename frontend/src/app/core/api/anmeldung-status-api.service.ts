import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnmeldeschlussStatus } from '@shared/anmeldung-status';

/**
 * Einziger Zugang zu GET /api/anmeldung/status (#318). Anmeldung (Anmeldeschluss, Teamlimit),
 * Teilnehmerverwaltung (Warnung beim Reaktivieren) und Export („8 / 96") lesen ihn.
 */
@Injectable({ providedIn: 'root' })
export class AnmeldungStatusApiService {
  private readonly http = inject(HttpClient);

  ladeStatus(): Observable<AnmeldeschlussStatus> {
    return this.http.get<AnmeldeschlussStatus>('/api/anmeldung/status');
  }
}
