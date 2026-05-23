package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminUserDetailsService implements UserDetailsService {

    private final AdminUserRepository adminUserRepository;

    @Override
    public UserDetails loadUserByUsername(String benutzername)
            throws UsernameNotFoundException {
        return adminUserRepository.findByBenutzername(benutzername)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Benutzer nicht gefunden: " + benutzername));
    }
}