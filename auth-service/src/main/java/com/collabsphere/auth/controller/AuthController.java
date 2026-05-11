package com.collabsphere.auth.controller;

import com.collabsphere.auth.dto.*;
import com.collabsphere.auth.entity.RefreshToken;
import com.collabsphere.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.collabsphere.auth.service.RefreshTokenService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;
    @PostMapping("/register")
    public ResponseEntity<String> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok("User registered successfully");
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
    @PostMapping("/refresh")
public ResponseEntity<AuthResponse> refreshToken(
        @RequestBody RefreshTokenRequest request) {

    return ResponseEntity.ok(
            authService.refresh(request.getRefreshToken())
    );
}
@PostMapping("/logout")
public ResponseEntity<String> logout(@RequestBody RefreshTokenRequest request) {

    RefreshToken token = refreshTokenService.findByToken(request.getRefreshToken());

    refreshTokenService.deleteByUser(token.getUser());

    return ResponseEntity.ok("Logged out successfully");
}
}