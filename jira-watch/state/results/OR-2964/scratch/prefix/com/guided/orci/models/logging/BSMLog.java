package com.guided.orci.models.logging;

import com.guided.orci.models.UUIDBaseModel;
import com.guided.orci.utils.JsonAllowed;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.envers.Audited;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Audited
@Entity
@Table(name = "bsm_logs",
       indexes = {
           @Index(name = "idx_bsm_logs_timestamp", columnList = "timestamp"),
           @Index(name = "idx_bsm_logs_machine_name", columnList = "machineName"),
           @Index(name = "idx_bsm_logs_received_at", columnList = "receivedAt")
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
@JsonAllowed
public class BSMLog extends UUIDBaseModel {

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "machine_name", nullable = false)
    private String machineName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "windows_username")
    private String windowsUsername;

    @Column(name = "received_at", nullable = false)
    private LocalDateTime receivedAt;
}