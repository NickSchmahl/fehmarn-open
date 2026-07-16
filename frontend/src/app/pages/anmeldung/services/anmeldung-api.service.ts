import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { AnmeldeschlussStatus, AnmeldungRequest } from '../model/anmeldung.model';

/** HTTP-Zugriffe der Anmeldung: Anmeldeschluss-Status laden und Anmeldung absenden. */
@Injectable({ providedIn: 'root' })
export class AnmeldungApiService {
  private readonly http = inject(HttpClient);

  ladeStatus(): Observable<AnmeldeschlussStatus> {
    return this.http.get<AnmeldeschlussStatus>('/api/anmeldung/status');
  }

  sendeAnmeldung(request: AnmeldungRequest): Observable<void> {
    return this.http.post('/api/anmeldung', request).pipe(map(() => void 0));
  }
}
