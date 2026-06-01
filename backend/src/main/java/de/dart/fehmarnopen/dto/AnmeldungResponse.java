package de.dart.fehmarnopen.dto;

import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import java.util.List;

public record AnmeldungResponse(List<DisziplinAnmeldungResponse> anmeldungen) {
    public record DisziplinAnmeldungResponse(Long id, Disziplin disziplin, String teamName, String abmeldetoken) {
        public static DisziplinAnmeldungResponse from(Anmeldung anmeldung) {
            return new DisziplinAnmeldungResponse(
                    anmeldung.getId(), anmeldung.getDisziplin(), anmeldung.getTeamName(), anmeldung.getAbmeldetoken());
        }
    }

    public static AnmeldungResponse from(List<Anmeldung> anmeldungen) {
        return new AnmeldungResponse(
                anmeldungen.stream().map(DisziplinAnmeldungResponse::from).toList());
    }
}
