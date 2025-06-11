package com.example.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.URL;
import lombok.Data;

@Data
@Entity
@Table(name = "passwords")
public class Password {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Username is required")
    private String username;

    @NotBlank(message = "Password is required")
    private String password;

    @URL(message = "Must be a valid URL")
    private String url;

    private String notes;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
} 