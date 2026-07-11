package de.dart.fehmarnopen.mapper;

import de.dart.fehmarnopen.dto.AdminUebersichtResponse;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse.DisziplinGruppe;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse.MeldungEintrag;
import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Spieler;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.stereotype.Component;

/**
 * Baut aus Anmeldungen die gruppierten Übersichts-DTOs (öffentlich und Admin). Gekapselt in einem
 * eigenen Mapper, damit die Assemblierungs-Details nicht die Kopplung des {@code AnmeldungService}
 * aufblähen und die Sortier-/Gruppierlogik an einer Stelle liegt.
 */
@Component
public class UebersichtMapper {

    /** Öffentliche Übersicht: je Disziplin die Meldungen, {@code anzahl} = Anzahl Meldungen. */
    public TeilnehmerUebersichtResponse zuOeffentlicheUebersicht(List<Anmeldung> anmeldungen) {
        List<DisziplinGruppe> gruppen = gruppiereNachDisziplin(anmeldungen).entrySet().stream()
                .map(gruppe -> {
                    List<MeldungEintrag> meldungen = sortierteMeldungen(gruppe.getValue())
                            .map(anmeldung ->
                                    new MeldungEintrag(anmeldung.getTeamName(), oeffentlicheSpieler(anmeldung)))
                            .toList();
                    return new DisziplinGruppe(gruppe.getKey(), meldungen.size(), meldungen);
                })
                .toList();
        return new TeilnehmerUebersichtResponse(gruppen);
    }

    /**
     * Admin-Übersicht: je Disziplin die Meldungen inkl. Status und Radikal-ID. {@code anzahl} zählt nur
     * die aktiven (nicht abgemeldeten) Meldungen; abgemeldete bleiben in der Liste.
     */
    public AdminUebersichtResponse zuAdminUebersicht(List<Anmeldung> anmeldungen) {
        List<AdminUebersichtResponse.DisziplinGruppe> gruppen = gruppiereNachDisziplin(anmeldungen).entrySet().stream()
                .map(gruppe -> {
                    List<AdminUebersichtResponse.MeldungEintrag> meldungen = sortierteMeldungen(gruppe.getValue())
                            .map(this::toAdminMeldung)
                            .toList();
                    int aktiveMeldungen = (int) gruppe.getValue().stream()
                            .filter(anmeldung -> !anmeldung.isAbgemeldet())
                            .count();
                    return new AdminUebersichtResponse.DisziplinGruppe(gruppe.getKey(), aktiveMeldungen, meldungen);
                })
                .toList();
        return new AdminUebersichtResponse(gruppen);
    }

    private AdminUebersichtResponse.MeldungEintrag toAdminMeldung(Anmeldung anmeldung) {
        List<AdminUebersichtResponse.SpielerEintrag> spieler = anmeldung.getSpieler().stream()
                .sorted(spielerReihenfolge())
                .map(einzelspieler -> new AdminUebersichtResponse.SpielerEintrag(
                        einzelspieler.getVorname(),
                        einzelspieler.getNachname(),
                        einzelspieler.getRadikalId(),
                        einzelspieler.getInitialen(),
                        einzelspieler.getGeburtsdatum()))
                .toList();
        return new AdminUebersichtResponse.MeldungEintrag(
                anmeldung.getId(), anmeldung.getTeamName(), anmeldung.isAnwesend(), anmeldung.isAbgemeldet(), spieler);
    }

    private List<TeilnehmerUebersichtResponse.SpielerEintrag> oeffentlicheSpieler(Anmeldung anmeldung) {
        return anmeldung.getSpieler().stream()
                .sorted(spielerReihenfolge())
                .map(einzelspieler -> new TeilnehmerUebersichtResponse.SpielerEintrag(
                        einzelspieler.getVorname(), einzelspieler.getNachname()))
                .toList();
    }

    /** Spieler einer Meldung nach Nachname, dann Vorname. */
    private Comparator<Spieler> spielerReihenfolge() {
        return Comparator.comparing(Spieler::getNachname).thenComparing(Spieler::getVorname);
    }

    /**
     * Meldungen einer Disziplin sortiert: nach Teamname (case-insensitive); teamlose Meldungen nach dem
     * Namen ihres (einzigen) Spielers. So bleiben gleichnamige Teams als getrennte Meldungen erhalten.
     */
    private Stream<Anmeldung> sortierteMeldungen(List<Anmeldung> anmeldungen) {
        return anmeldungen.stream()
                .sorted(Comparator.comparing(this::sortierSchluessel, String.CASE_INSENSITIVE_ORDER));
    }

    private String sortierSchluessel(Anmeldung anmeldung) {
        String teamName = anmeldung.getTeamName();
        if (teamName != null && !teamName.isBlank()) {
            return teamName;
        }
        return anmeldung.getSpieler().stream()
                .min(spielerReihenfolge())
                .map(spieler -> spieler.getNachname() + " " + spieler.getVorname())
                .orElse("");
    }

    /** Gruppiert Anmeldungen nach Disziplin; TreeMap sortiert die Gruppen in Enum-Reihenfolge. */
    private Map<Disziplin, List<Anmeldung>> gruppiereNachDisziplin(List<Anmeldung> anmeldungen) {
        return anmeldungen.stream()
                .collect(Collectors.groupingBy(Anmeldung::getDisziplin, TreeMap::new, Collectors.toList()));
    }
}
