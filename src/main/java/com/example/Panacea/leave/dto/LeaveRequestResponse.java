package com.example.Panacea.leave.dto;

import com.example.Panacea.leave.entity.LeaveRequest;
import com.example.Panacea.leave.entity.LeaveStatus;

import java.time.LocalDate;

public record LeaveRequestResponse(
        Long id,
        Long requesterId,
        String requesterName,
        String reason,
        LocalDate startDate,
        LocalDate endDate,
        LeaveStatus status,
        Long approverId,
        String attachmentPath
) {
    public static LeaveRequestResponse from(LeaveRequest leaveRequest) {
        return new LeaveRequestResponse(
                leaveRequest.getId(),
                leaveRequest.getRequester().getId(),
                leaveRequest.getRequester().getFirstName() + " " + leaveRequest.getRequester().getLastName(),
                leaveRequest.getReason(),
                leaveRequest.getStartDate(),
                leaveRequest.getEndDate(),
                leaveRequest.getStatus(),
                leaveRequest.getApprover() == null ? null : leaveRequest.getApprover().getId(),
                leaveRequest.getAttachmentPath());
    }
}
