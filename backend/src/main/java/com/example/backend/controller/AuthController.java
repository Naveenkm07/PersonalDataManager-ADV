package com.example.backend.controller;

import com.example.backend.model.User;
import com.example.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        User user = new User();
        user.setEmail(request.email());
        user.setPassword(request.password());
        user.setUsername(request.email()); // Using email as username for simplicity
        return ResponseEntity.ok(authService.register(user));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
        String token = authService.authenticate(loginRequest.email(), loginRequest.password());
        return ResponseEntity.ok(new LoginResponse(token));
    }
}

record LoginRequest(String email, String password) {}
record RegisterRequest(String email, String password) {}
record LoginResponse(String token) {} 