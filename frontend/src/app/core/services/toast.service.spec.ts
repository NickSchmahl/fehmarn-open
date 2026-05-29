import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
    service.toasts.set([]);
  });

  it('fügt einen Toast mit der korrekten Message hinzu', () => {
    service.show('Testfehler');

    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe('Testfehler');
  });

  it('entfernt einen Toast nach 5000ms automatisch', fakeAsync(() => {
    service.show('Wird entfernt');
    expect(service.toasts().length).toBe(1);

    tick(5000);

    expect(service.toasts().length).toBe(0);
  }));

  it('entfernt einen Toast nicht vor Ablauf der Zeitspanne', fakeAsync(() => {
    service.show('Noch da');
    tick(4999);

    expect(service.toasts().length).toBe(1);

    tick(1);
  }));

  it('entfernt gezielt den richtigen Toast per dismiss()', () => {
    service.show('Toast A');
    service.show('Toast B');

    service.toasts()[0].dismiss();

    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe('Toast B');
  });

  it('kann mehrere Toasts gleichzeitig anzeigen', () => {
    service.show('Fehler 1');
    service.show('Fehler 2');
    service.show('Fehler 3');

    expect(service.toasts().length).toBe(3);
  });

  it('vergibt jeder Toast eine eindeutige ID', () => {
    service.show('A');
    service.show('B');

    const ids = service.toasts().map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
  });
});
