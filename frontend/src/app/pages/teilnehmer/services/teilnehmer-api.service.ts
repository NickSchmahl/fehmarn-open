import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TeilnehmerUebersicht } from '../../../shared/teilnehmer-uebersicht';

/** Öffentliche Teilnehmerübersicht (GET /api/teilnehmer, #318) – nur die Teilnehmerseite nutzt sie. */
@Injectable({ providedIn: 'root' })
export class TeilnehmerApiService {
  private readonly http = inject(HttpClient);

  ladeUebersicht(): Observable<TeilnehmerUebersicht> {
    return this.http.get<TeilnehmerUebersicht>('/api/teilnehmer');
  }
}
