package com.collabsphere.project.notification;

import jakarta.mail.internet.MimeMessage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;

import org.springframework.scheduling.annotation.Async;

import org.springframework.stereotype.Service;

import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    private final TemplateEngine templateEngine;

    @Value("${notification.from-email}")
    private String fromEmail;

    @Value("${notification.from-name}")
    private String fromName;

    @Value("${notification.app-url}")
    private String appUrl;

    // ─────────────────────────────────────────────────────────
    // TASK ASSIGNED EMAIL
    // ─────────────────────────────────────────────────────────
    @Async
    public void sendTaskAssigned(
            String assigneeEmail,
            String assigneeName,
            String taskTitle,
            String taskDescription,
            String projectName,
            UUID projectId,
            String assignedByName
    ) {

        Context ctx = new Context();

        ctx.setVariable("assigneeName", assigneeName);

        ctx.setVariable("taskTitle", taskTitle);

        ctx.setVariable("taskDescription", taskDescription);

        ctx.setVariable("projectName", projectName);

        ctx.setVariable("assignedByName", assignedByName);

        ctx.setVariable(
                "projectUrl",
                appUrl + "/projects/" + projectId
        );

        ctx.setVariable("appUrl", appUrl);

        sendEmail(
                assigneeEmail,
                "📋 New task assigned: " + taskTitle,
                "task-assigned",
                ctx
        );
    }

    // ─────────────────────────────────────────────────────────
    // MEMBER ADDED EMAIL
    // ─────────────────────────────────────────────────────────
    @Async
    public void sendMemberAdded(
            String memberEmail,
            String memberName,
            String projectName,
            UUID projectId,
            String role,
            String addedByName
    ) {

        Context ctx = new Context();

        ctx.setVariable("memberName", memberName);

        ctx.setVariable("projectName", projectName);

        ctx.setVariable("role", role);

        ctx.setVariable("addedByName", addedByName);

        ctx.setVariable(
                "projectUrl",
                appUrl + "/projects/" + projectId
        );

        ctx.setVariable("appUrl", appUrl);

        sendEmail(
                memberEmail,
                "🎉 You've been added to " + projectName,
                "member-added",
                ctx
        );
    }

    // ─────────────────────────────────────────────────────────
    // PROJECT INVITATION EMAIL
    // ─────────────────────────────────────────────────────────
    @Async
    public void sendProjectInvitation(
            String inviteeEmail,
            String projectTitle,
            String role,
            String invitationLink
    ) {

        Context ctx = new Context();

        ctx.setVariable("projectTitle", projectTitle);

        ctx.setVariable("role", role);

        ctx.setVariable("invitationLink", invitationLink);

        ctx.setVariable("appUrl", appUrl);

        sendEmail(
                inviteeEmail,
                "🚀 Invitation to join project: " + projectTitle,
                "project-invitation",
                ctx
        );
    }

    // ─────────────────────────────────────────────────────────
    // CORE EMAIL SENDER
    // ─────────────────────────────────────────────────────────
    private void sendEmail(
            String to,
            String subject,
            String template,
            Context ctx
    ) {

        try {

            MimeMessage message =
                    mailSender.createMimeMessage();

            MimeMessageHelper helper =
                    new MimeMessageHelper(
                            message,
                            true,
                            "UTF-8"
                    );

            helper.setFrom(fromEmail, fromName);

            helper.setTo(to);

            helper.setSubject(subject);

            helper.setText(
                    templateEngine.process(template, ctx),
                    true
            );

            mailSender.send(message);

            log.info(
                    "Email sent successfully → {} | {}",
                    to,
                    subject
            );

        } catch (Exception e) {

            // Never break main business flow
            log.error(
                    "Email sending failed → {} | {} : {}",
                    to,
                    subject,
                    e.getMessage()
            );
        }
    }
}