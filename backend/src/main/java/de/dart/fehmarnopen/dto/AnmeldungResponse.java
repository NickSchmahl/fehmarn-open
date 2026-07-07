package de.dart.fehmarnopen.dto;

import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Spieler;
import java.util.List;

public record AnmeldungResponse(List<DisziplinAnmeldungResponse> anmeldungen) {

    public record DisziplinAnmeldungResponse(
            Long id, Disziplin disziplin, String teamName, List<SpielerResponse> spieler) {
        public static DisziplinAnmeldungResponse from(Anmeldung anmeldung) {
            List<SpielerResponse> spieler =
                    anmeldung.getSpieler().stream().map(SpielerResponse::from).toList();
            return new DisziplinAnmeldungResponse(
                    anmeldung.getId(), anmeldung.getDisziplin(), anmeldung.getTeamName(), spieler);
        }
    }

    public record SpielerResponse(String vorname, String nachname, String radicalId, boolean istErsatz) {
        public static SpielerResponse from(Spieler spieler) {
            return new SpielerResponse(
                    spieler.getVorname(), spieler.getNachname(), spieler.getRadicalId(), spieler.isIstErsatz());
        }
    }

    public static AnmeldungResponse from(List<Anmeldung> anmeldungen) {
        return new AnmeldungResponse(
                anmeldungen.stream().map(DisziplinAnmeldungResponse::from).toList());
    }
}
