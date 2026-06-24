import { HttpInterceptorFn } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID, REQUEST } from '@angular/core';
import { tokenCookie } from '../shared/constants';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.headers.has('Authorization') || isPublicAuthRequest(request.url)) {
    return next(request);
  }

  const platformId = inject(PLATFORM_ID);
  const cookieHeader = isPlatformBrowser(platformId)
    ? document.cookie
    : (inject(REQUEST, { optional: true })?.headers.get('cookie') ?? '');
  const token = isPlatformBrowser(platformId)
    ? localStorage.getItem(tokenCookie) ?? getCookieValue(cookieHeader, tokenCookie)
    : getCookieValue(cookieHeader, tokenCookie);

  if (!token) {
    return next(request);
  }

  return next(request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  }));
};

function isPublicAuthRequest(url: string): boolean {
  return /\/api\/auth\/(login|register)$/.test(url);
}

function getCookieValue(cookieHeader: string, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const prefix = `${name}=`;

  for (const part of cookieHeader.split(';')) {
    const cookie = part.trim();

    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.substring(prefix.length));
    }
  }

  return null;
}
