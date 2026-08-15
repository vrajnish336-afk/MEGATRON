/**
 * State Management for MEGADRONE Business OS
 */

class AppState {
  constructor() {
    this.token = localStorage.getItem('megadrone_token') || null;
    this.user = JSON.parse(localStorage.getItem('megadrone_user') || 'null');
    this.org = JSON.parse(localStorage.getItem('megadrone_org') || 'null');
    this.currentRoute = 'dashboard';
    this.listeners = new Set();
  }

  setAuth(token, user, org) {
    this.token = token;
    this.user = user;
    this.org = org;
    if (token) {
      localStorage.setItem('megadrone_token', token);
      localStorage.setItem('megadrone_user', JSON.stringify(user));
      localStorage.setItem('megadrone_org', JSON.stringify(org));
    } else {
      localStorage.removeItem('megadrone_token');
      localStorage.removeItem('megadrone_user');
      localStorage.removeItem('megadrone_org');
    }
    this.notify();
  }

  setRoute(route) {
    this.currentRoute = route;
    this.notify();
  }

  isAuthenticated() {
    return Boolean(this.token && this.user);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this);
    }
  }
}

export const state = new AppState();
