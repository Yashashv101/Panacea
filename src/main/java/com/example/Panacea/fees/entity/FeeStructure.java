package com.example.Panacea.fees.entity;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Semester;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;

/**
 * The canonical fee components for a (course, semester) pair. {@code FeePaymentService}
 * always recomputes the total from these fields server-side — a client-supplied
 * amount on the initiate request is never trusted.
 *
 * PROJECT_KNOWLEDGE.md's original Django model never had a fee-structure concept at
 * all (just a single flat FeePayment.amount, entered ad hoc per submission) — so
 * splitting into components is a rewrite-only decision, not a legacy-parity one, and
 * tuition + exam fee is the full set the task asked for, not a subset of a larger
 * legacy list.
 */
@Entity
@Table(name = "fee_structures", uniqueConstraints = {
        @UniqueConstraint(name = "uk_fee_structure_course_semester", columnNames = {"course_id", "semester_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeeStructure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    /**
     * Deliberately still mapped to the pre-existing "amount" column (not
     * "tuition_amount") — every row that existed before this split already has a
     * value in that column, and every one of them represented what a student was
     * being charged to attend that course/semester, i.e. tuition. Keeping the
     * column name means ddl-auto=update does nothing to it at all: no rename, no
     * risk of Hibernate treating it as a brand-new NOT NULL column on an
     * already-populated table (the Course.active problem). Existing rows are
     * therefore automatically and correctly backfilled as-is, with zero migration
     * code — only examFeeAmount below needs the explicit populated-table default.
     */
    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal tuitionAmount;

    /**
     * @ColumnDefault (not columnDefinition — see Semester.parity's comment for the
     * same choice) sets a DB-level default: ddl-auto=update issues a plain ALTER
     * TABLE ADD COLUMN for this new column against the existing (already-populated)
     * fee_structures table, and without a default that fails immediately with
     * "column exam_fee_amount contains null values" the moment any row already
     * exists — same fix as Course.active. Existing rows land on 0 until an admin
     * sets a real exam fee, rather than the boot failing outright.
     *
     * columnDefinition was tried first and had to be reverted: once the column
     * exists, a later boot's ddl-auto=update re-issues an ALTER COLUMN ... TYPE
     * using the *entire* columnDefinition string verbatim — "numeric(10,2) default
     * 0" — which Postgres rejects ("default" isn't valid inside a TYPE clause).
     * @ColumnDefault only feeds the DEFAULT clause on column creation and is never
     * replayed into a later type-alter, so it doesn't have this failure mode.
     */
    @Column(nullable = false, precision = 10, scale = 2)
    @ColumnDefault("0")
    private BigDecimal examFeeAmount;

    public BigDecimal getTotalAmount() {
        return tuitionAmount.add(examFeeAmount);
    }
}
