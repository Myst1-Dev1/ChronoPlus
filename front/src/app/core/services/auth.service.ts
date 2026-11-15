import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap, catchError, throwError, switchMap, filter, take } from 'rxjs';
import { AUTH_TOKEN_KEY } from '../graphql/graphql.provider';
import { environment } from '../../../environments/environment';

export const REFRESH_TOKEN_KEY = 'chronoplus_refresh_token';
export const USER_INFO_KEY = 'chronoplus_user_info';

export interface User {
  id: string;
  username: string;
  email: string;
  address?: string;
  state?: string;
  city?: string;
}

export interface SignInCredentials {
  email?: string;
  username?: string;
  password: string;
}

export interface SignUpData {
  username: string;
  email: string;
  password: string;
  address?: string;
  state?: string;
  city?: string;
}

export interface EditUserData {
  username?: string;
  email?: string;
  password?: string;
  address?: string;
  state?: string;
  city?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _isAuthenticated = signal<boolean>(this.hasValidToken());
  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  private readonly _currentUser = signal<User | null>(this.getStoredUser());
  readonly currentUser = this._currentUser.asReadonly();

  signIn(credentials: SignInCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/sign-in`, credentials).pipe(
      tap((res) => {
        this.setSession(res.accessToken, res.refreshToken, res.user);
      })
    );
  }

  signUp(data: SignUpData): Observable<AuthResponse> {
    const payload = {
      username: data.username,
      email: data.email,
      password: data.password,
      address: data.address || 'Não informado',
      state: data.state || 'SP',
      city: data.city || 'São Paulo'
    };

    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/sign-up`, payload).pipe(
      tap((res) => {
        this.setSession(res.accessToken, res.refreshToken, res.user);
      })
    );
  }

  editUser(data: EditUserData): Observable<{ user: User }> {
    return this.http.put<{ user: User }>(`${environment.apiUrl}/auth/edit-user`, data).pipe(
      tap((res) => {
        if (res.user) {
          const current = this._currentUser() || ({} as User);
          const updated: User = { ...current, ...res.user };
          localStorage.setItem(USER_INFO_KEY, JSON.stringify(updated));
          this._currentUser.set(updated);
        }
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  // Renova o par de tokens via POST http://localhost:3000/auth/refresh-token
  refreshToken(): Observable<{ accessToken: string; refreshToken: string }> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearSession();
      return throwError(() => new Error('Refresh token não encontrado.'));
    }

    return this.http
      .post<{ accessToken: string; refreshToken: string }>(
        `${environment.apiUrl}/auth/refresh-token`,
        { refreshToken }
      )
      .pipe(
        tap((res) => {
          this.setSession(res.accessToken, res.refreshToken);
        }),
        catchError((err) => {
          this.clearSession();
          return throwError(() => err);
        })
      );
  }

  private isRefreshing = false;
  private readonly refreshTokenSubject = new BehaviorSubject<string | null>(null);

  // Fila de renovação para reprocessar requisições em paralelo sem deslogar o usuário
  handle401Error(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.refreshToken().pipe(
        switchMap((tokens) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(tokens.accessToken);
          return next(
            req.clone({
              headers: req.headers.set('Authorization', 'Bearer ' + tokens.accessToken)
            })
          );
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.clearSession();
          return throwError(() => err);
        })
      );
    } else {
      return this.refreshTokenSubject.pipe(
        filter((token): token is string => token !== null),
        take(1),
        switchMap((token) => {
          return next(
            req.clone({
              headers: req.headers.set('Authorization', 'Bearer ' + token)
            })
          );
        })
      );
    }
  }

  setSession(accessToken: string, refreshToken?: string, user?: User): void {
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    if (user) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
      this._currentUser.set(user);
    }
    this._isAuthenticated.set(true);
  }

  clearSession(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    this._currentUser.set(null);
    this._isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  hasValidToken(): boolean {
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();
    if (!token && !refreshToken) return false;

    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (!payload.exp || Date.now() < payload.exp * 1000) {
            return true;
          }
        }
      } catch {
        // Ignora erro de parse
      }
    }

    // Se o access token expirou mas temos refresh token, mantém o usuário logado para renovação transparente
    return !!refreshToken;
  }

  private getStoredUser(): User | null {
    const raw = localStorage.getItem(USER_INFO_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}

