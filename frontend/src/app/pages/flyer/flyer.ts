import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BrandIconComponent } from '../../ui/brand-icon/brand-icon.component';
import { FLYER_TURNIER, FlyerZeile, flyerZeilen } from '../../shared/flyer-zeitplan';

@Component({
  selector: 'app-flyer',
  imports: [RouterLink, BrandIconComponent],
  templateUrl: './flyer.html',
  styleUrl: './flyer.scss',
})
export class Flyer {
  readonly turnier = FLYER_TURNIER;
  readonly zeilen: FlyerZeile[] = flyerZeilen();
}
