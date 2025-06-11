package com.example.backend.repository;

import com.example.backend.model.Password;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PasswordRepository extends JpaRepository<Password, Long> {
    List<Password> findByUserId(Long userId);
} 