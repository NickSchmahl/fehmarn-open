import { TestBed } from '@angular/core/testing';
import { BrandIconComponent } from './brand-icon.component';

describe('BrandIconComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandIconComponent],
    }).compileComponents();
  });

  it('rendert genau ein dekoratives SVG', () => {
    const fixture = TestBed.createComponent(BrandIconComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const svgs = element.querySelectorAll('svg');
    expect(svgs.length).toBe(1);
    expect(svgs[0].getAttribute('aria-hidden')).toBe('true');
  });

  it('enthält den Bullseye-Punkt in der Akzentfarbe', () => {
    const fixture = TestBed.createComponent(BrandIconComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const bullseye = element.querySelector('.brand-icon__bullseye');
    expect(bullseye).not.toBeNull();
  });
});
