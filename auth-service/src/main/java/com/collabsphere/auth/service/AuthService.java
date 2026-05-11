package com.collabsphere.auth.service;

import com.collabsphere.auth.dto.*;
import com.collabsphere.auth.entity.*;
import com.collabsphere.auth.exception.EmailAlreadyExistsException;
import com.collabsphere.auth.repository.RoleRepository;
import com.collabsphere.auth.repository.UserRepository;
import com.collabsphere.auth.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;
    



    public void register(RegisterRequest request) {

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new EmailAlreadyExistsException("Email already exists");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        Role role = roleRepository.findByName(RoleName.MEMBER)
                .orElseThrow(() -> new RuntimeException("Default role not found"));

        user.setRoles(Set.of(role));

        userRepository.save(user);
    }

public AuthResponse login(LoginRequest request) {

    authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                    request.getEmail(),
                    request.getPassword()
            )
    );

    User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("User not found"));

    Set<String> roles = user.getRoles()
            .stream()
            .map(role -> role.getName().name())
            .collect(java.util.stream.Collectors.toSet());

    String accessToken=jwtUtil.generateToken(user.getId().toString(), roles);

    RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

    return new AuthResponse(accessToken, refreshToken.getToken());
}
public AuthResponse refresh(String requestRefreshToken) {

    RefreshToken oldToken = refreshTokenService.findByToken(requestRefreshToken);

    refreshTokenService.verifyExpiration(oldToken);

    User user = oldToken.getUser();

    // Delete old refresh token
    refreshTokenService.deleteByUser(user);

    // Create new refresh token
    RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user);

    Set<String> roles = user.getRoles()
            .stream()
            .map(role -> role.getName().name())
            .collect(java.util.stream.Collectors.toSet());

    String newAccessToken = jwtUtil.generateToken(user.getId().toString(), roles);

    return new AuthResponse(newAccessToken, newRefreshToken.getToken());
}
}
