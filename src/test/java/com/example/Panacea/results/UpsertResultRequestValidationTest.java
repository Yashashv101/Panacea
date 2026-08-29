package com.example.Panacea.results;

import com.example.Panacea.results.dto.UpsertResultRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test1/Test2 are scaled 0-25 and experiential 0-30; upsertResult previously
 * accepted any value since only the frontend (which had no max attribute either)
 * stood between staff and an out-of-range entry. This is now enforced via Bean
 * Validation on the request DTO, per CLAUDE.md's rule to validate at that layer
 * rather than manually inside the service.
 */
class UpsertResultRequestValidationTest {

    private static final ValidatorFactory FACTORY = Validation.buildDefaultValidatorFactory();
    private static final Validator VALIDATOR = FACTORY.getValidator();

    @Test
    void rejectsTest1AboveTwentyFive() {
        UpsertResultRequest request = new UpsertResultRequest(1L, 1L, 1L, 26.0, 10.0, 10.0, 40.0);
        assertFalse(VALIDATOR.validate(request).isEmpty());
    }

    @Test
    void rejectsTest2BelowZero() {
        UpsertResultRequest request = new UpsertResultRequest(1L, 1L, 1L, 10.0, -1.0, 10.0, 40.0);
        assertFalse(VALIDATOR.validate(request).isEmpty());
    }

    @Test
    void rejectsExperientialAboveThirty() {
        UpsertResultRequest request = new UpsertResultRequest(1L, 1L, 1L, 10.0, 10.0, 30.5, 40.0);
        assertFalse(VALIDATOR.validate(request).isEmpty());
    }

    @Test
    void acceptsInRangeValues() {
        UpsertResultRequest request = new UpsertResultRequest(1L, 1L, 1L, 25.0, 25.0, 30.0, 100.0);
        Set<ConstraintViolation<UpsertResultRequest>> violations = VALIDATOR.validate(request);
        assertTrue(violations.isEmpty(), () -> "unexpected violations: " + violations);
    }
}
