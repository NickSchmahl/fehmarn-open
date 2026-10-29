import { Component, input } from '@angular/core';

/**
 * Karte für einen Export auf der Export-Seite: Format-Symbol (kleines „Blatt" mit Kürzel, reines
 * CSS), Titel, Beschreibung und darunter der Inhalt. Aktionen (Buttons) kommen per
 * `<div karteAktionen>` und stehen immer unten in der Karte.
 */
@Component({
  selector: 'app-export-karte',
  standalone: true,
  template: `
    <article class="karte" [class.karte--haupt]="haupt()">
      <div class="karte-kopf">
        <span class="format" [class.format--pdf]="format() === 'PDF'" aria-hidden="true">{{
          format()
        }}</span>
        <div>
          <h3>{{ titel() }}</h3>
          <p class="beschreibung"><ng-content select="[karteBeschreibung]" /></p>
        </div>
      </div>
      <ng-content />
      <div class="aktionen"><ng-content select="[karteAktionen]" /></div>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .karte {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 1.4rem 1.5rem 1.5rem;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--surface);
      }
      .karte--haupt {
        border-color: rgba(232, 197, 71, 0.45);
        box-shadow:
          0 0 0 1px rgba(232, 197, 71, 0.08),
          0 20px 48px rgba(0, 0, 0, 0.35);
      }
      .karte-kopf {
        display: flex;
        align-items: flex-start;
        gap: 0.9rem;
      }
      .format {
        position: relative;
        flex: none;
        display: grid;
        place-items: end center;
        width: 46px;
        height: 54px;
        padding-bottom: 7px;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: var(--surface-2);
        color: var(--text-soft);
        font-size: 0.66rem;
        font-weight: 700;
        letter-spacing: 0.08em;
      }
      .format::before {
        content: '';
        position: absolute;
        top: 9px;
        right: 10px;
        left: 10px;
        height: 14px;
        background: repeating-linear-gradient(var(--text-dim) 0 2px, transparent 2px 5px);
      }
      .format--pdf {
        border-color: rgba(232, 197, 71, 0.4);
        color: var(--accent);
      }
      h3 {
        margin: 0;
        color: var(--text);
        font-size: 1.15rem;
      }
      .beschreibung {
        margin: 0.35rem 0 0;
        color: var(--text-soft);
        font-size: 0.9rem;
        line-height: 1.5;
      }
      .aktionen {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.7rem;
        margin-top: auto;
        padding-top: 1.4rem;
      }
      .aktionen:empty {
        display: none;
      }
    `,
  ],
})
export class ExportKarteComponent {
  readonly titel = input.required<string>();
  readonly format = input.required<'PDF' | 'CSV'>();
  /** Hauptkarte (Turniertag-Liste): mit Gold-Rahmen hervorgehoben. */
  readonly haupt = input(false);
}
