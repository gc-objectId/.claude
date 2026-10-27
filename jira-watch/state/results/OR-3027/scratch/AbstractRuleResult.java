package com.guided.orci.models.rules;

import com.guided.orci.models.UUIDBaseModel;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.Column;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MappedSuperclass;
import org.hibernate.annotations.Type;

import java.util.HashMap;
import java.util.Map;

@MappedSuperclass
public class AbstractRuleResult extends UUIDBaseModel {
    protected String ruleIdentifier;

    @Type(JsonType.class)
    @Column(columnDefinition = "json")
    protected Map<String, Object> details = new HashMap<>();

    @ManyToOne
    @JoinColumn(name = "rule_execution_context_id", nullable = false)
    protected RuleExecutionContext ruleExecutionContext;

    public String getRuleIdentifier() { return ruleIdentifier; }
    public void setRuleIdentifier(String ruleIdentifier) { this.ruleIdentifier = ruleIdentifier; }
    public Map<String, Object> getDetails() { return details; }
    public void setDetails(Map<String, Object> details) { this.details = details; }
    public RuleExecutionContext getRuleExecutionContext() { return ruleExecutionContext; }
    public void setRuleExecutionContext(RuleExecutionContext ruleExecutionContext) { this.ruleExecutionContext = ruleExecutionContext; }
}
