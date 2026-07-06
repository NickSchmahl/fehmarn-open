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
}
