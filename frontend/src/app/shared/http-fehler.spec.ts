import { extrahiereFehlermeldung } from './http-fehler';

describe('extrahiereFehlermeldung', () => {
  it('bevorzugt die Backend-Meldung unter error.message', () => {
    const err = { error: { message: 'Backend sagt nein' }, message: 'HTTP 400' };
    expect(extrahiereFehlermeldung(err)).toBe('Backend sagt nein');
  });

  it('fällt auf message des Fehlerobjekts zurück', () => {
    expect(extrahiereFehlermeldung(new Error('Kaputt'))).toBe('Kaputt');
    expect(extrahiereFehlermeldung({ message: 'Nur oben' })).toBe('Nur oben');
  });

  it('liefert den Fallback bei unbrauchbaren Werten', () => {
    expect(extrahiereFehlermeldung(null)).toBe('Unbekannter Fehler');
    expect(extrahiereFehlermeldung('nur ein String')).toBe('Unbekannter Fehler');
    expect(extrahiereFehlermeldung({ error: { message: 42 }, message: 42 })).toBe(
      'Unbekannter Fehler',
    );
  });
});
