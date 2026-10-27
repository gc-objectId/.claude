package com.guided.orci.models.rules;

import com.guided.orci.models.UUIDBaseModel;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.Column;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Type;

import java.util.HashMap;
import java.util.Map;

@MappedSuperclass
@Getter
@Setter
public class AbstractRuleResult extends UUIDBaseModel {
    protected String ruleIdentifier;

    @Type(JsonType.class)
    @Column(columnDefinition = "json")
    protected Map<String, Object> details = new HashMap<>();

    @ManyToOne
    @JoinColumn(name = "rule_execution_context_id", nullable = false)
    protected RuleExecutionContext ruleExecutionContext;
}
