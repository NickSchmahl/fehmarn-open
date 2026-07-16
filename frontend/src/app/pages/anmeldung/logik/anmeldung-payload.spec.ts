import { DISZIPLINEN } from '../../../shared/disziplin';
import { AnmeldungFormWert, SpielerFormWert } from '../model/anmeldung.model';
import { erstelleAnmeldungRequest, toSpielerPayload } from './anmeldung-payload';

const HERRENDOPPEL = DISZIPLINEN.findIndex((d) => d.value === 'HERRENDOPPEL');

function spieler(werte: Partial<SpielerFormWert> = {}): SpielerFormWert {
  return {
    vorname: 'Max',
    nachname: 'Mustermann',
    hatKeineRadikalId: false,
    radikalId: 'MM01011990',
    initialen: '',
    geburtsdatum: '',
    ...werte,
  };
}

describe('toSpielerPayload', () => {
  it('sendet die Radikal ID und blendet Initialen/Geburtsdatum aus', () => {
    expect(toSpielerPayload(spieler({ initialen: 'MM', geburtsdatum: '1990-01-01' }))).toEqual({
      vorname: 'Max',
      nachname: 'Mustermann',
      radikalId: 'MM01011990',
      initialen: null,
      geburtsdatum: null,
    });
  });

  it('sendet im „keine ID"-Modus Initialen+Geburtsdatum und blendet die Radikal ID aus', () => {
    expect(
      toSpielerPayload(
        spieler({ hatKeineRadikalId: true, initialen: 'MM', geburtsdatum: '1990-01-01' }),
      ),
    ).toEqual({
      vorname: 'Max',
      nachname: 'Mustermann',
      radikalId: null,
      initialen: 'MM',
      geburtsdatum: '1990-01-01',
    });
  });

  it('wandelt leere und null-Werte in null-Felder um', () => {
    expect(toSpielerPayload(spieler({ radikalId: '   ' })).radikalId).toBeNull();
    expect(toSpielerPayload(spieler({ radikalId: null })).radikalId).toBeNull();
  });
});

describe('erstelleAnmeldungRequest', () => {
  it('übernimmt nur angehakte Disziplinen und normalisiert den Teamnamen', () => {
    const wert: AnmeldungFormWert = {
      disziplinen: DISZIPLINEN.map(() => ({ selected: false, meldungen: [] })),
    };
    wert.disziplinen[HERRENDOPPEL] = {
      selected: true,
      meldungen: [
        { teamName: '  Die   Bullseye Boys ', spieler: [spieler()] },
        { teamName: 'Zweite Garde', spieler: [spieler({ vorname: 'Tom', nachname: 'Test' })] },
      ],
    };

    const request = erstelleAnmeldungRequest(wert);

    expect(request.disziplinen).toHaveLength(2);
    expect(request.disziplinen[0].disziplin).toBe('HERRENDOPPEL');
    expect(request.disziplinen[0].teamName).toBe('Die Bullseye Boys');
    expect(request.disziplinen[1].teamName).toBe('Zweite Garde');
    expect(request.disziplinen[0].spieler[0].vorname).toBe('Max');
  });

  it('liefert einen leeren Request ohne Auswahl', () => {
    const wert: AnmeldungFormWert = {
      disziplinen: DISZIPLINEN.map(() => ({ selected: false, meldungen: [] })),
    };
    expect(erstelleAnmeldungRequest(wert)).toEqual({ disziplinen: [] });
  });
});
