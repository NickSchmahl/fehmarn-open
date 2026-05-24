package de.dart.fehmarnopen.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Getter
@ConfigurationProperties(prefix = "fehmarnopen.admin")
@Component
public class AdminProperties {

    private final List<Account> accounts = new ArrayList<>();

    @Setter
    @Getter
    public static class Account {
        private String username;
        private String password;
    }
}
