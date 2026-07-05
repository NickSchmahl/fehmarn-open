package de.dart.fehmarnopen;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noFields;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import jakarta.persistence.Entity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RestController;

/**
 * Architekturvertrag als ausführbare Regeln (Issue #49). Hält die Schichtung und Konventionen
 * maschinell durch – jede Verletzung bricht den Build (Phase verify).
 */
@AnalyzeClasses(packages = "de.dart.fehmarnopen", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitekturTest {

    @ArchTest
    static final ArchRule keineZyklenZwischenPaketen =
            slices().matching("de.dart.fehmarnopen.(*)..").should().beFreeOfCycles();

    @ArchTest
    static final ArchRule controllerGreifenNichtDirektAufRepositoriesZu = noClasses()
            .that()
            .resideInAPackage("..controller..")
            .should()
            .dependOnClassesThat()
            .resideInAPackage("..repository..")
            .because("Controller sollen über Services gehen, nicht direkt auf Repositories.");

    @ArchTest
    static final ArchRule controllerNamenskonvention = classes()
            .that()
            .resideInAPackage("..controller..")
            .and()
            .areTopLevelClasses()
            .should()
            .haveSimpleNameEndingWith("Controller")
            .andShould()
            .beAnnotatedWith(RestController.class);

    @ArchTest
    static final ArchRule serviceNamenskonvention = classes()
            .that()
            .resideInAPackage("..service..")
            .and()
            .areTopLevelClasses()
            .should()
            .haveSimpleNameEndingWith("Service");

    @ArchTest
    static final ArchRule repositoriesSindInterfaces = classes()
            .that()
            .resideInAPackage("..repository..")
            .and()
            .areTopLevelClasses()
            .should()
            .beInterfaces()
            .andShould()
            .haveSimpleNameEndingWith("Repository");

    @ArchTest
    static final ArchRule entitiesNurImEntityPaket =
            classes().that().areAnnotatedWith(Entity.class).should().resideInAPackage("..entity..");

    @ArchTest
    static final ArchRule keinFieldInjection = noFields()
            .should()
            .beAnnotatedWith(Autowired.class)
            .because("Konstruktor-Injection statt Feld-Injection verwenden.");

    @ArchTest
    static final ArchRule keinZugriffAufStandardStreams = NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;
}
