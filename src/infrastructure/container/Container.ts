/**
 * Dependency Injection Container
 *
 * Einfacher DI Container ohne externe Abhängigkeiten.
 * Verbindet Interfaces (Ports) mit konkreten Implementierungen.
 *
 * @example
 * // Registration
 * const container = Container.getInstance();
 * container.register(TOKENS.UserRepository, () => new SupabaseUserRepository());
 *
 * // Resolution
 * const repo = container.resolve<IUserRepository>(TOKENS.UserRepository);
 */

type Factory<T> = () => T;

interface Registration<T> {
  factory: Factory<T>;
  singleton: boolean;
  instance?: T;
}

export class Container {
  private static instance: Container;
  private registrations = new Map<symbol, Registration<unknown>>();

  private constructor() {}

  /**
   * Gibt die Singleton-Instanz des Containers zurück
   */
  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Registriert eine Factory für ein Token (transient - neue Instanz bei jedem resolve)
   */
  register<T>(token: symbol, factory: Factory<T>): void {
    this.registrations.set(token, { factory, singleton: false });
  }

  /**
   * Registriert eine Factory für ein Token (singleton - gleiche Instanz bei jedem resolve)
   */
  registerSingleton<T>(token: symbol, factory: Factory<T>): void {
    this.registrations.set(token, { factory, singleton: true });
  }

  /**
   * Löst eine Abhängigkeit auf
   * @throws Error wenn kein Token registriert ist
   */
  resolve<T>(token: symbol): T {
    const registration = this.registrations.get(token);
    if (!registration) {
      throw new Error(`No registration found for token: ${String(token)}`);
    }

    if (registration.singleton) {
      if (registration.instance === undefined) {
        registration.instance = registration.factory();
      }
      return registration.instance as T;
    }

    return registration.factory() as T;
  }

  /**
   * Setzt alle Registrierungen zurück (für Tests)
   */
  reset(): void {
    this.registrations.clear();
  }
}
