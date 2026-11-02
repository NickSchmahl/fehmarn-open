import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastAnzeige, ToastComponent } from './toast.component';

describe('ToastComponent', () => {
  let fixture: ComponentFixture<ToastComponent>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function zeige(toasts: readonly ToastAnzeige[]): void {
    fixture.componentRef.setInput('toasts', toasts);
    fixture.detectChanges();
  }

  function toast(id: number, message: string, dismiss = jest.fn()): ToastAnzeige {
    return { id, message, dismiss };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ToastComponent] });
    fixture = TestBed.createComponent(ToastComponent);
  });

  it('zeigt ohne Toasts nur den leeren Stapel', () => {
    zeige([]);
    expect(element().querySelector('.toast-stapel')).not.toBeNull();
    expect(element().querySelectorAll('.toast').length).toBe(0);
  });

  it('zeigt jeden Toast als Alert mit seiner Meldung', () => {
    zeige([toast(1, 'Erster Fehler'), toast(2, 'Zweiter Fehler')]);

    const toasts = element().querySelectorAll('.toast[role="alert"]');
    expect(toasts.length).toBe(2);
    expect(toasts[0].querySelector('.toast-text')?.textContent.trim()).toBe('Erster Fehler');
  });

  it('ruft beim Klick auf Schließen dismiss des Toasts auf', () => {
    const dismiss = jest.fn();
    zeige([toast(1, 'Weg damit', dismiss)]);

    const button = element().querySelector<HTMLButtonElement>('.toast-schliessen');
    expect(button?.getAttribute('aria-label')).toBe('Schließen');
    expect(button?.type).toBe('button');
    button?.click();

    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('nutzt keine Tailwind-Utility-Klassen mehr (#322)', () => {
    zeige([toast(1, 'Fehler')]);

    const klassen = Array.from(element().querySelectorAll('[class]')).flatMap((el) =>
      Array.from(el.classList),
    );
    expect(klassen.sort()).toEqual(['toast', 'toast-schliessen', 'toast-stapel', 'toast-text']);
  });
});
