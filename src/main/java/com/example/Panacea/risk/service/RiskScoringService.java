package com.example.Panacea.risk.service;

import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.risk.dto.RiskSnapshotResponse;
import com.example.Panacea.risk.dto.StudentRiskResponse;
import com.example.Panacea.risk.dto.StudentRiskResponse.RiskFactorContribution;
import com.example.Panacea.risk.entity.RiskSnapshot;
import com.example.Panacea.risk.repository.RiskSnapshotRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.stream.IntStream;

/**
 * Predicts an at-risk probability for each student from their attendance and marks.
 *
 * <p>There is no real "did this student drop out" outcome recorded anywhere in this
 * system, so there is no ground truth to train against. The model instead learns from
 * a heuristic proxy label ({@link #isProxyAtRisk}) derived from the same
 * attendance/marks features it predicts from. That still makes this a genuine logistic
 * regression — it learns smooth, weighted coefficients and outputs a probability
 * rather than directly evaluating the threshold rule — but the label itself is a
 * documented placeholder. Swap in a real outcome field here the day one exists;
 * nothing else in this class needs to change.
 */
@Service
@RequiredArgsConstructor
public class RiskScoringService {

    private static final double ATTENDANCE_RISK_THRESHOLD = 65.0;
    private static final double MARKS_RISK_THRESHOLD = 45.0;
    private static final double MEDIUM_RISK_CUTOFF = 0.33;
    private static final double HIGH_RISK_CUTOFF = 0.66;
    private static final String[] FACTOR_NAMES = {"Attendance", "Average Marks", "Marks Trend"};

    private final UserRepository userRepository;
    private final RiskFeatureService riskFeatureService;
    private final RiskSnapshotRepository riskSnapshotRepository;

    @Cacheable(value = "studentRisk", key = "#studentId")
    @Transactional(readOnly = true)
    public StudentRiskResponse computeRisk(Long studentId) {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("Student " + studentId + " not found"));
        if (student.getRole() != Role.STUDENT) {
            throw new IllegalArgumentException("User " + studentId + " is not a student");
        }

        List<StudentFeatures> allFeatures = allStudentFeatures();
        LogisticRegressionModel.TrainedModel model = trainModel(allFeatures);

        StudentFeatures target = allFeatures.stream()
                .filter(f -> f.studentId().equals(studentId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Student " + studentId + " not found"));

        return toResponse(target, model);
    }

    @Transactional(readOnly = true)
    public List<StudentRiskResponse> listAtRiskStudents() {
        return rankedResponses().stream()
                .filter(r -> !"LOW".equals(r.riskLevel()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StudentRiskResponse> listAllStudentsRisk() {
        return rankedResponses();
    }

    @Transactional(readOnly = true)
    public List<RiskSnapshotResponse> getHistory(Long studentId) {
        if (!userRepository.existsById(studentId)) {
            throw new EntityNotFoundException("Student " + studentId + " not found");
        }
        return riskSnapshotRepository.findByStudentIdOrderByComputedAtAsc(studentId).stream()
                .map(RiskSnapshotResponse::from)
                .toList();
    }

    /**
     * Computes current risk for every student and persists one {@link RiskSnapshot}
     * each, so {@link #getHistory} has something to show over time. Called nightly by
     * {@code RiskSnapshotScheduler}, and backfilled with synthetic history by
     * {@code DemoDataSeeder} so the feature has data to show immediately.
     */
    @Transactional
    public void recordSnapshotForAllStudents() {
        List<StudentFeatures> allFeatures = allStudentFeatures();
        if (allFeatures.isEmpty()) {
            return;
        }
        LogisticRegressionModel.TrainedModel model = trainModel(allFeatures);
        Instant now = Instant.now();

        List<RiskSnapshot> snapshots = allFeatures.stream()
                .map(features -> {
                    StudentRiskResponse response = toResponseWithoutTrend(features, model);
                    return RiskSnapshot.builder()
                            .student(userRepository.getReferenceById(features.studentId()))
                            .computedAt(now)
                            .attendancePercentage(response.attendancePercentage())
                            .averageMarksPercentage(response.averageMarksPercentage())
                            .marksTrend(response.marksTrend())
                            .riskProbability(response.riskProbability())
                            .riskLevel(response.riskLevel())
                            .build();
                })
                .toList();
        riskSnapshotRepository.saveAll(snapshots);
    }

    /**
     * Writes one historical-looking {@link RiskSnapshot} directly from caller-supplied
     * numbers, with no training involved — used only by {@code DemoDataSeeder} to
     * backfill a plausible trend line for the demo dataset, since real historical
     * attendance/marks-over-time doesn't exist to recompute against (marks have no
     * date in this schema). {@link #recordSnapshotForAllStudents} is the real,
     * model-driven path; this is explicitly the synthetic one.
     */
    @Transactional
    public void recordSyntheticSnapshot(Long studentId, Instant computedAt, double attendancePercentage,
                                         double averageMarksPercentage, double marksTrend, double riskProbability) {
        riskSnapshotRepository.save(RiskSnapshot.builder()
                .student(userRepository.getReferenceById(studentId))
                .computedAt(computedAt)
                .attendancePercentage(round(attendancePercentage))
                .averageMarksPercentage(round(averageMarksPercentage))
                .marksTrend(round(marksTrend))
                .riskProbability(round(riskProbability))
                .riskLevel(riskLevel(riskProbability))
                .build());
    }

    private List<StudentRiskResponse> rankedResponses() {
        List<StudentFeatures> allFeatures = allStudentFeatures();
        if (allFeatures.isEmpty()) {
            return List.of();
        }
        LogisticRegressionModel.TrainedModel model = trainModel(allFeatures);
        return allFeatures.stream()
                .map(f -> toResponse(f, model))
                .sorted(Comparator.comparingDouble(StudentRiskResponse::riskProbability).reversed())
                .toList();
    }

    private List<StudentFeatures> allStudentFeatures() {
        return userRepository.findByRole(Role.STUDENT).stream()
                .map(riskFeatureService::computeFor)
                .toList();
    }

    private LogisticRegressionModel.TrainedModel trainModel(List<StudentFeatures> allFeatures) {
        List<double[]> features = allFeatures.stream()
                .map(f -> new double[]{f.attendancePercentage(), f.averageMarksPercentage(), f.marksTrend()})
                .toList();
        List<Integer> labels = allFeatures.stream()
                .map(f -> isProxyAtRisk(f) ? 1 : 0)
                .toList();
        return LogisticRegressionModel.train(features, labels);
    }

    /** Documented placeholder label — see the class-level Javadoc. */
    private boolean isProxyAtRisk(StudentFeatures features) {
        return features.attendancePercentage() < ATTENDANCE_RISK_THRESHOLD
                || features.averageMarksPercentage() < MARKS_RISK_THRESHOLD;
    }

    private StudentRiskResponse toResponse(StudentFeatures features, LogisticRegressionModel.TrainedModel model) {
        StudentRiskResponse base = toResponseWithoutTrend(features, model);
        Double trendDelta = riskTrendDelta(features.studentId(), base.riskProbability());
        return new StudentRiskResponse(
                base.studentId(), base.studentName(), base.attendancePercentage(), base.averageMarksPercentage(),
                base.marksTrend(), base.riskProbability(), base.riskLevel(), base.riskFactors(), trendDelta);
    }

    private StudentRiskResponse toResponseWithoutTrend(StudentFeatures features, LogisticRegressionModel.TrainedModel model) {
        double[] rawFeatures = {features.attendancePercentage(), features.averageMarksPercentage(), features.marksTrend()};
        double probability = LogisticRegressionModel.predict(model, rawFeatures);
        List<RiskFactorContribution> riskFactors = buildRiskFactors(model, rawFeatures);

        return new StudentRiskResponse(
                features.studentId(),
                features.studentName(),
                round(features.attendancePercentage()),
                round(features.averageMarksPercentage()),
                round(features.marksTrend()),
                round(probability),
                riskLevel(probability),
                riskFactors,
                null);
    }

    private List<RiskFactorContribution> buildRiskFactors(LogisticRegressionModel.TrainedModel model, double[] rawFeatures) {
        double[] terms = LogisticRegressionModel.contributionTerms(model, rawFeatures);
        return IntStream.range(0, terms.length)
                .mapToObj(i -> new RiskFactorContribution(FACTOR_NAMES[i], round(terms[i])))
                .sorted(Comparator.comparingDouble((RiskFactorContribution c) -> Math.abs(c.contribution())).reversed())
                .toList();
    }

    /** Current probability minus the oldest stored snapshot's — null if no history exists yet. */
    private Double riskTrendDelta(Long studentId, double currentProbability) {
        List<RiskSnapshot> history = riskSnapshotRepository.findByStudentIdOrderByComputedAtAsc(studentId);
        if (history.isEmpty()) {
            return null;
        }
        return round(currentProbability - history.get(0).getRiskProbability());
    }

    private String riskLevel(double probability) {
        if (probability < MEDIUM_RISK_CUTOFF) {
            return "LOW";
        }
        if (probability < HIGH_RISK_CUTOFF) {
            return "MEDIUM";
        }
        return "HIGH";
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
