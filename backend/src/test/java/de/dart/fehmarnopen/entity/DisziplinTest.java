package de.dart.fehmarnopen.entity;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

class DisziplinTest {

    @Test
    void katalog_enthaeltDamendoppel_mitLabel() {
        assertThat(Disziplin.DAMENDOPPEL.getLabel()).isEqualTo("Damendoppel");
    }

    @Test
    void katalog_enthaeltKeinMixedDoppel() {
        assertThat(Arrays.stream(Disziplin.values()).map(Enum::name)).doesNotContain("MIXED_DOPPEL");
    }

    @Test
    void istEinzel_nurFuerEinzelDisziplinen() {
        assertThat(Disziplin.HERRENEINZEL.istEinzel()).isTrue();
        assertThat(Disziplin.DAMENEINZEL.istEinzel()).isTrue();
        assertThat(Disziplin.U18.istEinzel()).isTrue();
        assertThat(Disziplin.HERRENDOPPEL.istEinzel()).isFalse();
        assertThat(Disziplin.DAMENDOPPEL.istEinzel()).isFalse();
        assertThat(Disziplin.TRIPLE_MIX.istEinzel()).isFalse();
        assertThat(Disziplin.TEAMWETTBEWERB.istEinzel()).isFalse();
    }
}
