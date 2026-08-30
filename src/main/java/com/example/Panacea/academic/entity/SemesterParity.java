package com.example.Panacea.academic.entity;

/**
 * ODD = the half of the academic year starting in the first half of the
 * calendar year cycle (e.g. July-Dec), EVEN = the second half (Jan-June).
 * Derived purely from Semester.number — 1,3,5,7 are always ODD and 2,4,6,8
 * are always EVEN, never independently settable. See SemesterService's
 * parity-derivation for the actual rule.
 */
public enum SemesterParity {
    ODD,
    EVEN
}
