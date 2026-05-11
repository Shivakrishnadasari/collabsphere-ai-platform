package com.collabsphere.project.websocket;

import com.collabsphere.project.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtUtil jwtUtil;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    // ── STOMP endpoints ───────────────────────────────────────
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins.split(","))
                .addInterceptors(jwtHandshakeInterceptor())
                .withSockJS();
    }

    // ── Message broker ────────────────────────────────────────
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    // ── JWT auth on CONNECT frame ─────────────────────────────
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // Try Authorization header first
                    String token = accessor.getFirstNativeHeader("Authorization");
                    if (token != null && token.startsWith("Bearer ")) {
                        token = token.substring(7);
                    } else {
                        // Fall back to session attribute set during handshake
                        Object t = accessor.getSessionAttributes() != null
                                ? accessor.getSessionAttributes().get("token") : null;
                        if (t != null) token = t.toString();
                    }

                    if (token != null && jwtUtil.isTokenValid(token)) {
                        String userId = jwtUtil.extractUserId(token);
                        List<String> roles = jwtUtil.extractRoles(token);

                        List<SimpleGrantedAuthority> authorities = roles == null
                                ? List.of()
                                : roles.stream()
                                        .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                                        .collect(Collectors.toList());

                        accessor.setUser(new UsernamePasswordAuthenticationToken(
                                userId, null, authorities));
                    }
                }
                return message;
            }
        });
    }

    // ── Handshake interceptor: extract token from ?token= query param ──
    private HandshakeInterceptor jwtHandshakeInterceptor() {
        return new HandshakeInterceptor() {
            @Override
            public boolean beforeHandshake(ServerHttpRequest request,
                                           ServerHttpResponse response,
                                           WebSocketHandler wsHandler,
                                           Map<String, Object> attributes) {
                String query = request.getURI().getQuery();
                if (query != null && query.contains("token=")) {
                    String token = query.substring(query.indexOf("token=") + 6);
                    if (token.contains("&")) token = token.substring(0, token.indexOf("&"));
                    if (jwtUtil.isTokenValid(token)) {
                        attributes.put("token", token);
                        attributes.put("userId", jwtUtil.extractUserId(token));
                        return true;
                    }
                }
                // Also allow Authorization header
                String authHeader = request.getHeaders().getFirst("Authorization");
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    String token = authHeader.substring(7);
                    if (jwtUtil.isTokenValid(token)) {
                        attributes.put("token", token);
                        attributes.put("userId", jwtUtil.extractUserId(token));
                        return true;
                    }
                }
                return false;
            }

            @Override
            public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                       WebSocketHandler wsHandler, Exception ex) {}
        };
    }
}