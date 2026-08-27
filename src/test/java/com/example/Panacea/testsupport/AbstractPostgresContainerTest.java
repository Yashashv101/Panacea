package com.example.Panacea.testsupport;

import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Shared Postgres Testcontainers setup so every test — slice or full context —
 * runs against a real Postgres instance instead of an in-memory database,
 * matching the production datastore. The container is a single static instance
 * reused across all subclasses within a JVM run; Testcontainers' Ryuk resource
 * reaper tears it down when the JVM exits, so it is intentionally never stopped here.
 */
@Testcontainers
public abstract class AbstractPostgresContainerTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");
}
