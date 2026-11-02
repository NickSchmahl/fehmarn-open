import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService } from '../../core/services/toast.service';
import { ToastComponent } from './toast.component';

describe('ToastComponent', () => {
  let fixture: ComponentFixture<ToastComponent>;
  let service: ToastService;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastComponent],
    }).compileComponents();

    service = TestBed.inject(ToastService);
    service.toasts.set([]);
    fixture = TestBed.createComponent(ToastComponent);
    fixture.detectChanges();
  });

  it('zeigt ohne Toasts nur den leeren Stapel', () => {
    expect(element().querySelector('.toast-stapel')).not.toBeNull();
    expect(element().querySelectorAll('.toast').length).toBe(0);
  });

  it('zeigt jeden Toast als Alert mit seiner Meldung', () => {
    service.show('Erster Fehler');
    service.show('Zweiter Fehler');
    fixture.detectChanges();

    const toasts = element().querySelectorAll('.toast[role="alert"]');
    expect(toasts.length).toBe(2);
    expect(toasts[0].querySelector('.toast-text')?.textContent.trim()).toBe('Erster Fehler');
  });

  it('entfernt den Toast beim Klick auf Schließen', () => {
    service.show('Weg damit');
    fixture.detectChanges();

    const button = element().querySelector<HTMLButtonElement>('.toast-schliessen');
    expect(button?.getAttribute('aria-label')).toBe('Schließen');
    expect(button?.type).toBe('button');
    button?.click();
    fixture.detectChanges();

    expect(element().querySelectorAll('.toast').length).toBe(0);
  });

  it('nutzt keine Tailwind-Utility-Klassen mehr (#322)', () => {
    service.show('Fehler');
    fixture.detectChanges();

    const klassen = Array.from(element().querySelectorAll('[class]')).flatMap((el) =>
      Array.from(el.classList),
    );
    expect(klassen.sort()).toEqual(['toast', 'toast-schliessen', 'toast-stapel', 'toast-text']);
  });
});
