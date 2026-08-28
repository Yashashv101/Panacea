package com.example.Panacea.audit.repository;

import com.example.Panacea.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
}
