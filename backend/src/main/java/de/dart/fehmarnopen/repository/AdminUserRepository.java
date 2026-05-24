package de.dart.fehmarnopen.repository;

import de.dart.fehmarnopen.entity.AdminUser;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminUserRepository extends JpaRepository<AdminUser, Long> {
    Optional<AdminUser> findByBenutzername(String benutzername);

    boolean existsByBenutzername(String benutzername);
}
