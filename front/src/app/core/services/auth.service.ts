import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
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

  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
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

  private hasValidToken(): boolean {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
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

