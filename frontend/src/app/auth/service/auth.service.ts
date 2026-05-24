import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';
import {map, Observable, tap} from 'rxjs';

interface LoginResponse {
  token: string;
}

@Injectable({providedIn: 'root'})
export class AuthService {
  private readonly TOKEN_KEY = 'token';
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  login(username: string, password: string): Observable<void> {
    return this.http
      .post<LoginResponse>('/api/auth/login', {username, password})
      .pipe(
        tap(({token}) => localStorage.setItem(this.TOKEN_KEY, token)),
        map(() => void 0)
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.router.navigate(['/admin/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
