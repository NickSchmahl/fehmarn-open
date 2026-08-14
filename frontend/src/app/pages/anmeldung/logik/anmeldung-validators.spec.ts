import { FormControl } from '@angular/forms';
import { radikalIdPatternValidator } from './anmeldung-validators';

describe('radikalIdPatternValidator', () => {
  it('akzeptiert ID mit optionalem Großbuchstaben am Ende', () => {
    const ctrl = new FormControl('MM01011990A');
    const err = radikalIdPatternValidator(ctrl as any);
    expect(err).toBeNull();
  });

  it('akzeptiert ID ohne Suffix', () => {
    const ctrl = new FormControl('MM01011990');
    const err = radikalIdPatternValidator(ctrl as any);
    expect(err).toBeNull();
  });

  it('lehnt Kleinbuchstaben-Suffix ab', () => {
    const ctrl = new FormControl('MM01011990a');
    const err = radikalIdPatternValidator(ctrl as any);
    expect(err).toEqual({ pattern: true });
  });

  it('lehnt falsches Format ab', () => {
    const ctrl = new FormControl('M101011990');
    const err = radikalIdPatternValidator(ctrl as any);
    expect(err).toEqual({ pattern: true });
  });
});
