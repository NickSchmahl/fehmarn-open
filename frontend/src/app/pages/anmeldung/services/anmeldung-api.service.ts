import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { AnmeldungRequest } from '../model/anmeldung.model';

/**
 * Anmeldung absenden (POST /api/anmeldung). Den Anmeldeschluss-Status liefert der gemeinsame
 * AnmeldungStatusApiService aus core/api (#318).
 */
@Injectable({ providedIn: 'root' })
export class AnmeldungApiService {
  private readonly http = inject(HttpClient);

  sendeAnmeldung(request: AnmeldungRequest): Observable<void> {
    return this.http.post('/api/anmeldung', request).pipe(map(() => void 0));
  }
}
