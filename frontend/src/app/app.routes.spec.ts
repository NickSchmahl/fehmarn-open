import { routes } from './app.routes';

describe('routes', () => {
  const erwarteteTitelProPfad: Record<string, string> = {
    anmeldung: '12. Fehmarn Open 2027 – Anmeldung',
    teilnehmer: '12. Fehmarn Open 2027 – Teilnehmer',
    flyer: '12. Fehmarn Open 2027',
    impressum: '12. Fehmarn Open 2027 – Impressum',
    datenschutz: '12. Fehmarn Open 2027 – Datenschutz',
    'admin/login': '12. Fehmarn Open 2027 – Admin-Login',
  };

  it.each(Object.entries(erwarteteTitelProPfad))(
    'setzt für Route "%s" den Titel "%s"',
    (pfad, erwarteterTitel) => {
      const route = routes.find((eintrag) => eintrag.path === pfad);
      expect(route?.title).toBe(erwarteterTitel);
    },
  );
});
