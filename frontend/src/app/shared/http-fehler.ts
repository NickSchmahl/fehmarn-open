// Typsichere Extraktion einer Fehlermeldung aus unbekannten (HTTP-)Fehlerobjekten.
// Bevorzugt die Backend-Meldung (`error.message`), fällt auf `message` des Fehlers selbst zurück.

/** Extrahiert typsicher eine Fehlermeldung aus einem unbekannten Fehlerobjekt. */
export function extrahiereFehlermeldung(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const backendError = (err as { error?: unknown }).error;
    if (typeof backendError === 'object' && backendError !== null && 'message' in backendError) {
      const message = backendError.message;
      if (typeof message === 'string') return message;
    }
    if ('message' in err) {
      const message = err.message;
      if (typeof message === 'string') return message;
    }
  }
  return 'Unbekannter Fehler';
}
