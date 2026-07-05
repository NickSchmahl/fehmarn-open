package de.dart.fehmarnopen.entity;

import jakarta.persistence.*;
import java.util.Collection;
import java.util.List;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Entity
@Table(name = "admin_user")
@Data
@NoArgsConstructor
public class AdminUser implements UserDetails {

    // UserDetails erweitert Serializable -> expliziter serialVersionUID (SE_NO_SERIALVERSIONID).
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String benutzername;

    @Column(name = "passwort_hash", nullable = false)
    private String passwortHash;

    // UserDetails Interface
    @Override
    public String getUsername() {
        return benutzername;
    }

    @Override
    public String getPassword() {
        return passwortHash;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
