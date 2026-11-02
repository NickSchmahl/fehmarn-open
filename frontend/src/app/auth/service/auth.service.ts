import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, Observable, tap } from 'rxjs';

interface LoginResponse {
  token: string;
}

/**
 * Ablaufzeitpunkt (ms seit Epoch) aus dem `exp`-Claim eines JWT, oder null, wenn das Token keinen
 * lesbaren `exp`-Claim hat. Die Signatur prüft das Backend – hier geht es nur darum, ein sicher
 * abgelaufenes Token nicht als Login zu werten.
 */
export function jwtAblauf(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp: unknown = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Liest das gespeicherte Token; ein laut `exp` abgelaufenes wird verworfen und entfernt. */
function gespeichertesToken(): string | null {
  const token = localStorage.getItem(AuthService.TOKEN_KEY);
  if (token === null) {
    return null;
  }
  const ablauf = jwtAblauf(token);
  if (ablauf !== null && ablauf <= Date.now()) {
    localStorage.removeItem(AuthService.TOKEN_KEY);
    return null;
  }
  return token;
}

/**
 * Einzige Quelle des Login-Status (#319). Das Token liegt in einem Signal, initialisiert aus
 * localStorage; login()/logout() halten Signal und Speicher synchron. Komponenten, Guard und
 * Interceptor lesen nur `eingeloggt()` bzw. `getToken()`, nie localStorage direkt.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  static readonly TOKEN_KEY = 'token';
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly token = signal<string | null>(gespeichertesToken());

  /** Reaktiver Login-Status – Header, Guard und Admin-Seiten folgen ihm ohne Reload. */
  readonly eingeloggt = computed(() => this.token() !== null);

  login(username: string, password: string): Observable<void> {
    return this.http.post<LoginResponse>('/api/auth/login', { username, password }).pipe(
      tap(({ token }) => {
        localStorage.setItem(AuthService.TOKEN_KEY, token);
        this.token.set(token);
      }),
      map(() => void 0),
    );
  }

  logout(): void {
    localStorage.removeItem(AuthService.TOKEN_KEY);
    this.token.set(null);
    void this.router.navigate(['/admin/login']);
  }

  getToken(): string | null {
    return this.token();
  }
}
