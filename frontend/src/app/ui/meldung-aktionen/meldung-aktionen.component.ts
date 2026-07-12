import { Component, input, output } from '@angular/core';

// Kompaktes Aktions-Cluster für eine Admin-Meldung: Anwesend-Toggle plus
// Abmelden/Reaktivieren als Icon-Buttons. Präsentational – kennt weder die
// Meldungs-id noch HTTP; die Seite verdrahtet die Events mit den Service-Calls.
@Component({
  selector: 'app-meldung-aktionen',
  standalone: true,
  templateUrl: './meldung-aktionen.component.html',
  styleUrl: './meldung-aktionen.component.scss',
})
export class MeldungAktionenComponent {
  readonly anwesend = input.required<boolean>();
  readonly abgemeldet = input.required<boolean>();

  readonly toggleAnwesenheit = output<boolean>();
  readonly abmelden = output();
  readonly reaktivieren = output();
}
