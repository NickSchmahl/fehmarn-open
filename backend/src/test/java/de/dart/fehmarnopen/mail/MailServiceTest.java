package de.dart.fehmarnopen.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import de.dart.fehmarnopen.config.MailProperties;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.event.AbmeldungBestaetigtEvent;
import de.dart.fehmarnopen.event.AnmeldungBestaetigtEvent;
import jakarta.mail.internet.MimeMessage;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

class MailServiceTest {

    private JavaMailSender mailSender;
    private MailProperties mailProperties;
    private MailService mailService;

    @BeforeEach
    void setUp() {
        JavaMailSenderImpl echterSender = new JavaMailSenderImpl();
        mailSender = mock(JavaMailSender.class);
        when(mailSender.createMimeMessage()).thenAnswer(i -> echterSender.createMimeMessage());

        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        SpringTemplateEngine templateEngine = new SpringTemplateEngine();
        templateEngine.setTemplateResolver(resolver);

        mailProperties = new MailProperties();
        mailProperties.setFrom("noreply@fehmarn-open.de");
        mailProperties.setEnabled(true);

        mailService = new MailService(mailSender, templateEngine, mailProperties);
    }

    private MimeMessage capture() throws Exception {
        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());
        return captor.getValue();
    }

    @Test
    void sendeAnmeldebestaetigung_sollHtmlMailMitDisziplinenSenden() throws Exception {
        mailService.sendeAnmeldebestaetigung(new AnmeldungBestaetigtEvent(
                "anna@example.com",
                "Anna",
                "Schmidt",
                List.of(new AnmeldungBestaetigtEvent.Position(Disziplin.HERRENDOPPEL, "Team A"))));

        MimeMessage msg = capture();
        assertThat(msg.getAllRecipients()[0].toString()).isEqualTo("anna@example.com");
        assertThat(msg.getSubject()).contains("Anmeldebestätigung");
        String body = (String) msg.getContent();
        assertThat(body).contains("Anna").contains("Herrendoppel").contains("Team A");
    }

    @Test
    void sendeAbmeldebestaetigung_sollHtmlMailMitDisziplinSenden() throws Exception {
        mailService.sendeAbmeldebestaetigung(
                new AbmeldungBestaetigtEvent("bert@example.com", "Bert", "Adam", Disziplin.DAMENEINZEL, null));

        MimeMessage msg = capture();
        assertThat(msg.getAllRecipients()[0].toString()).isEqualTo("bert@example.com");
        assertThat(msg.getSubject()).contains("Abmeldebestätigung");
        assertThat((String) msg.getContent()).contains("Bert").contains("Dameneinzel");
    }

    @Test
    void sendeAnmeldebestaetigung_beiDeaktiviertemVersand_sendetNicht() {
        mailProperties.setEnabled(false);

        mailService.sendeAnmeldebestaetigung(
                new AnmeldungBestaetigtEvent("anna@example.com", "Anna", "Schmidt", List.of()));

        verify(mailSender, never()).send(any(MimeMessage.class));
    }
}
