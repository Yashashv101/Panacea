package com.example.Panacea.testsupport;

import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Shared Postgres Testcontainers setup so every test — slice or full context —
 * runs against a real Postgres instance instead of an in-memory database,
 * matching the production datastore.
 *
 * The container is started exactly once, in a static initializer, deliberately
 * WITHOUT {@code @Testcontainers}/{@code @Container}. Those JUnit5 annotations
 * register the field in a per-test-class {@code ExtensionContext.Store} whose
 * cleanup callback calls {@code stop()} at the end of *every* test class — even
 * for a field this is `static` and meant to be shared across classes. That stops
 * (and nulls out) the one container every other test class was still using, so
 * the next class's `beforeAll` sees no container running and starts a brand-new
 * one; whichever cached Spring `DataSource` still points at the old container's
 * now-dead port then fails with "connection refused". A static initializer runs
 * exactly once per classloader and isn't tied to any single test class's
 * lifecycle, so every subclass safely shares the same running container.
 * {@code @ServiceConnection} still wires the datasource — Spring resolves it
 * from the container's current connection details independently of the JUnit5
 * container lifecycle extension. Cleanup is handled by Testcontainers' Ryuk
 * reaper, which every started container registers with automatically, so no
 * explicit stop() is needed (or wanted) here.
 */
public abstract class AbstractPostgresContainerTest {

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    static {
        POSTGRES.start();
    }
}
