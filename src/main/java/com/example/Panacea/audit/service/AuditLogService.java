package com.example.Panacea.audit.service;

import com.example.Panacea.audit.entity.AuditLog;
import com.example.Panacea.audit.repository.AuditLogRepository;
import com.example.Panacea.identity.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Called explicitly from the handful of write paths that need an audit trail
 * (see CLAUDE.md Phase 6) rather than via an AOP interceptor — at this scale,
 * explicit calls are easier to reason about than a generic advice that has to
 * infer actor/entity from arbitrary method signatures.
 */
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void record(User actor, String action, String entityType, Long entityId, String detail) {
        auditLogRepository.save(AuditLog.builder()
                .actor(actor)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .detail(detail)
                .build());
    }
}
