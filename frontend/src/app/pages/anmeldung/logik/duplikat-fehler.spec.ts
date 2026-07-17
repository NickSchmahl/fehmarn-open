import { HttpErrorResponse } from '@angular/common/http';
import { DISZIPLINEN } from '../../../shared/disziplin';
import { parseSpielerDuplikat, parseTeamnameDuplikat } from './duplikat-fehler';

const HERRENDOPPEL = DISZIPLINEN.findIndex((d) => d.value === 'HERRENDOPPEL');
const HERRENEINZEL = DISZIPLINEN.findIndex((d) => d.value === 'HERRENEINZEL');

function fehler409(field?: string, message?: string): HttpErrorResponse {
  return new HttpErrorResponse({ status: 409, error: { errors: [{ field, message }] } });
}

describe('parseTeamnameDuplikat', () => {
  it('erkennt eine Disziplin-Feldkennung und übernimmt die Backend-Meldung', () => {
    expect(parseTeamnameDuplikat(fehler409('HERRENDOPPEL', 'Schon vergeben'))).toEqual({
      disziplinIndex: HERRENDOPPEL,
      message: 'Schon vergeben',
    });
  });

  it('liefert eine Default-Meldung, wenn das Backend keine mitschickt', () => {
    expect(parseTeamnameDuplikat(fehler409('HERRENDOPPEL'))?.message).toBe(
      'Teamname ist in dieser Disziplin bereits vergeben.',
    );
  });

  it('ignoriert unbekannte Feldkennungen, fehlende errors und Nicht-409-Fehler', () => {
    expect(parseTeamnameDuplikat(fehler409('QUATSCH'))).toBeNull();
    expect(parseTeamnameDuplikat(new HttpErrorResponse({ status: 409, error: {} }))).toBeNull();
    expect(
      parseTeamnameDuplikat(new HttpErrorResponse({ status: 400, error: { errors: [] } })),
    ).toBeNull();
    expect(parseTeamnameDuplikat(new Error('kein HTTP-Fehler'))).toBeNull();
  });

  it('behandelt Spieler-Feldkennungen (mit Doppelpunkt) nicht als Teamname-Dublette', () => {
    expect(parseTeamnameDuplikat(fehler409('HERRENEINZEL:0'))).toBeNull();
  });
});

describe('parseSpielerDuplikat', () => {
  it('erkennt die Feldkennung "<DISZIPLIN>:<index>"', () => {
    expect(parseSpielerDuplikat(fehler409('HERRENEINZEL:1', 'Doppelt gemeldet'))).toEqual({
      disziplinIndex: HERRENEINZEL,
      meldungIndex: 1,
      message: 'Doppelt gemeldet',
    });
  });

  it('liefert eine Default-Meldung, wenn das Backend keine mitschickt', () => {
    expect(parseSpielerDuplikat(fehler409('HERRENEINZEL:0'))?.message).toBe(
      'Diese Person ist in dieser Disziplin bereits gemeldet.',
    );
  });

  it('ignoriert Kennungen ohne Doppelpunkt, unbekannte Disziplinen und kaputte Indizes', () => {
    expect(parseSpielerDuplikat(fehler409('HERRENEINZEL'))).toBeNull();
    expect(parseSpielerDuplikat(fehler409('QUATSCH:0'))).toBeNull();
    expect(parseSpielerDuplikat(fehler409('HERRENEINZEL:abc'))).toBeNull();
    expect(parseSpielerDuplikat(fehler409('HERRENEINZEL:-1'))).toBeNull();
  });
});
