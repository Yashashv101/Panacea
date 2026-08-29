package com.example.Panacea.risk;

import com.example.Panacea.risk.service.RiskScoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Nightly job that builds up {@code RiskSnapshot} history for the at-risk trend indicator. */
@Component
@RequiredArgsConstructor
public class RiskSnapshotScheduler {

    private final RiskScoringService riskScoringService;

    @Scheduled(cron = "0 0 2 * * *")
    public void recordDailySnapshot() {
        riskScoringService.recordSnapshotForAllStudents();
    }
}
