package com.example.backend.controller;

import com.example.backend.model.Password;
import com.example.backend.repository.PasswordRepository;
import com.example.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/passwords")
@RequiredArgsConstructor
public class PasswordController {

    private final PasswordRepository passwordRepository;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<List<Password>> getPasswords(Authentication authentication) {
        Long userId = authService.getUserIdFromAuthentication(authentication);
        return ResponseEntity.ok(passwordRepository.findByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<Password> createPassword(
            @Valid @RequestBody Password password,
            Authentication authentication
    ) {
        Long userId = authService.getUserIdFromAuthentication(authentication);
        password.setUser(authService.getUserById(userId));
        return ResponseEntity.ok(passwordRepository.save(password));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Password> updatePassword(
            @PathVariable Long id,
            @Valid @RequestBody Password password,
            Authentication authentication
    ) {
        Long userId = authService.getUserIdFromAuthentication(authentication);
        return passwordRepository.findById(id)
                .filter(p -> p.getUser().getId().equals(userId))
                .map(existingPassword -> {
                    existingPassword.setTitle(password.getTitle());
                    existingPassword.setUsername(password.getUsername());
                    existingPassword.setPassword(password.getPassword());
                    existingPassword.setUrl(password.getUrl());
                    existingPassword.setNotes(password.getNotes());
                    return ResponseEntity.ok(passwordRepository.save(existingPassword));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePassword(
            @PathVariable Long id,
            Authentication authentication
    ) {
        Long userId = authService.getUserIdFromAuthentication(authentication);
        return passwordRepository.findById(id)
                .filter(p -> p.getUser().getId().equals(userId))
                .map(password -> {
                    passwordRepository.delete(password);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
} 