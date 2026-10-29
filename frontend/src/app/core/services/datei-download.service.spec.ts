import { TestBed } from '@angular/core/testing';
import { DateiDownloadService } from './datei-download.service';

/** Liest die Bytes eines Blobs (jsdom kennt Blob.arrayBuffer() nicht, wohl aber FileReader). */
function alsBytes(blob: Blob): Promise<number[]> {
  return new Promise((resolve) => {
    const leser = new FileReader();
    leser.onload = () => {
      resolve(Array.from(new Uint8Array(leser.result as ArrayBuffer)));
    };
    leser.readAsArrayBuffer(blob);
  });
}

describe('DateiDownloadService', () => {
  let service: DateiDownloadService;
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    // jsdom kennt keine Object-URLs – hier gemockt.
    createObjectURL = jest.fn().mockReturnValue('blob:test');
    revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    service = TestBed.inject(DateiDownloadService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('klickt einen temporären Download-Link mit Dateiname und räumt ihn wieder weg', () => {
    const klick = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    service.herunterladen('a;b\r\n', 'test.csv', 'text/csv;charset=utf-8');

    const geklickterLink = klick.mock.contexts[0] as HTMLAnchorElement | undefined;
    expect(geklickterLink?.download).toBe('test.csv');
    expect(geklickterLink?.getAttribute('href')).toBe('blob:test');
    expect(document.querySelector('a[download]')).toBeNull();
    klick.mockRestore();
  });

  it('erzeugt einen UTF-8-Blob mit MIME-Typ; ein BOM landet als EF BB BF in der Datei', async () => {
    jest.useRealTimers();
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    service.herunterladen('\uFEFFkühl', 'test.csv', 'text/csv;charset=utf-8');

    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8');
    // BOM, dann "kühl" mit ü als UTF-8 (C3 BC).
    expect(await alsBytes(blob)).toEqual([0xef, 0xbb, 0xbf, 0x6b, 0xc3, 0xbc, 0x68, 0x6c]);
  });

  it('gibt die Object-URL erst nach dem Klick frei', () => {
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    service.herunterladen('inhalt', 'test.csv', 'text/csv;charset=utf-8');

    expect(revokeObjectURL).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
