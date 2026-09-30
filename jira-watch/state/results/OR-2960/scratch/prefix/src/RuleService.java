package com.guided.orci.service.rules;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import com.google.common.collect.BiMap;
import com.google.common.collect.HashBiMap;
import com.guided.orci.engine.EvaluationResultPrompt;
import com.guided.orci.engine.RuleDefinition;
import com.guided.orci.engine.config.ParameterizedRule;
import com.guided.orci.engine.config.RuleConfig;
import com.guided.orci.engine.rule.RuleCategory;
import com.guided.orci.engine.rule.timer.*;
import com.guided.orci.models.rules.TenantRuleConfiguration;
import com.guided.orci.multitenancy.context.TenantContextHolder;
import com.guided.orci.repository.RuleDefinitionRepository;
import com.guided.orci.repository.TenantRuleConfigurationRepository;
import com.guided.orci.service.RedisService;
import com.guided.orci.service.RuleFeatureFlagService;
import com.guided.orci.utils.MapUtils;
import jakarta.annotation.PostConstruct;
import org.jetbrains.annotations.NotNull;
import org.reflections.Reflections;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class RuleService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(RuleService.class);
    private BiMap<String, Class> rulesById = HashBiMap.create();

    private Map<String, RuleDefinition> definitions = new HashMap<>();

    private final Map<RuleCategory, Set<String>> rulesByCategory = new ConcurrentHashMap<>();

    private ApplicationContext applicationContext;

    private TenantRuleConfigurationRepository tenantRuleConfigurationRepository;

    private final BiMap<String, Class<? extends RuleConfig>> ruleIdToConfigClassMap = HashBiMap.create();

    // Cache keyed by (tenant, ruleId): stored rule configs live in each tenant's own schema,
    // so a ruleId-only key would leak one tenant's config to another co-located tenant (e.g.
    // MGH and Mayo share an app instance in AWS prod) within the cache's TTL window.
    private final LoadingCache<RuleConfigCacheKey, RuleConfig> ruleConfigCache;

    private record RuleConfigCacheKey(String tenant, String ruleId) {}

    private final RuleDefinitionRepository ruleDefinitionRepository;

    private final RuleFeatureFlagService ruleFeatureFlagService;

    @Autowired
    RuleService(ApplicationContext applicationContext, TenantRuleConfigurationRepository tenantRuleConfigurationRepository,
                RuleDefinitionRepository ruleDefinitionRepository, RuleFeatureFlagService ruleFeatureFlagService) {
        this.applicationContext = applicationContext;
        this.tenantRuleConfigurationRepository = tenantRuleConfigurationRepository;
        this.ruleFeatureFlagService = ruleFeatureFlagService;
        this.ruleConfigCache = CacheBuilder.newBuilder()
                .expireAfterAccess(Duration.ofSeconds(30))
                .build(new CacheLoader<>() {
                    @Override
                    public @NotNull RuleConfig load(@NotNull RuleConfigCacheKey key) {
                        var ruleId = key.ruleId();
                        log.warn("OR-2960 red check: pre-fix ruleConfigCache loading {} from database", key);
                        var configClass = ruleIdToConfigClassMap.get(ruleId);
                        if (configClass == null) {
                            throw new RuntimeException("Rule '" + ruleId + "' does not have any associated config. " +
                                                       "Ensure the rule implements ParameterizedRule.");
                        }
                        var storedConfig = tenantRuleConfigurationRepository.findByRuleIdentifier(ruleId);
                        if (storedConfig.isPresent()) {
                            return makeRuleConfigFromTenantRuleConfig(configClass, storedConfig.get());
                        } else {
                            return makeRuleConfigFromDefaults(configClass);
                        }
                    }
                });
        this.ruleDefinitionRepository = ruleDefinitionRepository;
        log.warn("OR-2960 red check: pre-fix RuleService active, ruleConfigCache built with expireAfterAccess(30s)");
    }

    private List<String> vitalSignAlertIds = List.of(
            MAPLessThan55Rule.ID,
            MAPBelowBaselineRule.ID,
            LowO2SaturationRule.ID,
            LowHeartRateRule.ID,
            HighSystolicBPRule.ID,
            NoArterialLineBPRule.ID,
            NoNIBPRule.ID

    );


    @PostConstruct
    public void initialize() {
        Reflections reflections = new Reflections("com.guided.orci");
        reflections.getTypesAnnotatedWith(RuleDefinition.class).forEach(clazz -> {
            RuleDefinition definition = clazz.getAnnotation(RuleDefinition.class);
            if (rulesById.containsKey(definition.id())) {
                throw new RuntimeException("More than one rule has the same id: '%s'. rule1: %s rule2: %s".formatted(
                        definition.id(), clazz, rulesById.get(definition.id())));
            }

            rulesById.put(definition.id(), clazz);
            definitions.put(definition.id(), definition);

            Optional<ParameterizedType> parameterizedRuleTypeInstance = Arrays.stream(clazz.getGenericInterfaces())
                    .flatMap(it -> it instanceof ParameterizedType p
                                   && p.getRawType().equals(ParameterizedRule.class)
                            ? Stream.of(p) : Stream.empty())
                    .findFirst();
            if (parameterizedRuleTypeInstance.isPresent()) {
                var ruleConfigClass = (Class<? extends RuleConfig>) parameterizedRuleTypeInstance.get().getActualTypeArguments()[0];
                validateConfigClass(ruleConfigClass);
                ruleIdToConfigClassMap.put(definition.id(), ruleConfigClass);
            }
        });
    }

    public EvaluationResultPrompt generatePrompt(String ruleId) {
        if (!rulesById.containsKey(ruleId)) {
            return null;
        }
        try {

            Class clazz = rulesById.get(ruleId);
            Object object = null;
            try {
                object = this.applicationContext.getBean(clazz);
            } catch (Exception e) {

            }
            if (object == null) {
                object = clazz.newInstance();
            }
            Method method = clazz.getMethod("createPrompt", Map.class);
            Map<String, Object> map = new HashMap<>();
            return (EvaluationResultPrompt) method.invoke(object, map);
        } catch (Exception e) {
            log.error("Unable to generate prompt for {}", ruleId, e);
        }
        return null;

    }

    public Optional<RuleDefinition> getDefinition(String ruleId) {
        return Optional.ofNullable(this.definitions.get(ruleId));
    }

    public String getRuleCacheRedisScope(String caseId) {
        return "case" + RedisService.DEFAULT_SEPARATOR + caseId;
    }

    public Collection<RuleDefinition> getDefinitions() {
        return this.definitions.values();
    }

    public Optional<RuleConfig> getConfig(String ruleId) {
        try {
            return Optional.of(ruleConfigCache.get(cacheKey(ruleId)));
        } catch (ExecutionException e) {
            return Optional.empty();
        }
    }

    private static RuleConfigCacheKey cacheKey(String ruleId) {
        String tenant = TenantContextHolder.hasTenant() ? TenantContextHolder.getTenant().value() : "";
        return new RuleConfigCacheKey(tenant, ruleId);
    }

    public Set<RuleCategory> getRuleCategories(String ruleId) {
        return getDefinition(ruleId)
                .map(it -> Arrays.stream(it.categories()).collect(Collectors.toSet()))
                .orElse(Set.of());
    }

    public boolean ruleHasCategory(String ruleId, RuleCategory category) {
        return getRuleCategories(ruleId).contains(category);
    }

    /**
     * Definitions are annotations read once at startup, so a category's membership is fixed for the
     * life of the process and computed once.
     */
    public Set<String> getRulesWithRuleCategory(RuleCategory ruleCategory) {
        return rulesByCategory.computeIfAbsent(ruleCategory, category -> getDefinitions().stream()
                .filter(definition -> Arrays.asList(definition.categories()).contains(category))
                .map(RuleDefinition::id)
                .collect(Collectors.toUnmodifiableSet()));
    }

    public <T extends RuleConfig> T getConfig(Class<? extends ParameterizedRule<T>> ruleClass) {
        String ruleId = rulesById.inverse().get(ruleClass);
        return (T) getConfig(ruleId)
                .orElseThrow(() ->
                        new RuntimeException(("Rule %s implemented ParameterizedRule but " +
                                              "for some reason we failed to find its config.").formatted(ruleId)));
    }

    public Optional<TenantRuleConfiguration> getTenantRuleConfiguration(String ruleId) {
        return tenantRuleConfigurationRepository.findByRuleIdentifier(ruleId);
    }

    public TenantRuleConfiguration saveStoredConfiguration(TenantRuleConfiguration tenantRuleConfiguration) {
        var result = this.tenantRuleConfigurationRepository.save(tenantRuleConfiguration);
        var configClass = ruleIdToConfigClassMap.get(result.getRuleIdentifier());
        ruleConfigCache.put(cacheKey(result.getRuleIdentifier()), makeRuleConfigFromTenantRuleConfig(configClass, result));
        return result;
    }

    private static <T extends RuleConfig> T makeRuleConfigFromTenantRuleConfig(Class<T> clazz, TenantRuleConfiguration tenantRuleConfiguration) {
        try {
            return clazz.getDeclaredConstructor(TenantRuleConfiguration.class).newInstance(tenantRuleConfiguration);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static RuleConfig makeRuleConfigFromDefaults(Class<? extends RuleConfig> key) {
        try {
            return key.getDeclaredConstructor().newInstance();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static void validateConfigClass(Class<? extends RuleConfig> config) {
        try {
            config.getDeclaredConstructor(TenantRuleConfiguration.class);
        } catch (NoSuchMethodException e) {
            throw new RuntimeException("RuleConfig (" + config.getName() + ") must declare a single arg constructor " +
                                       "accepting RuleConfiguration");
        }
        try {
            config.getDeclaredConstructor();
        } catch (NoSuchMethodException e) {
            throw new RuntimeException("RuleConfig (" + config.getName() + ") must declare a zero arg constructor");
        }
    }

    public TenantRuleConfiguration updateConfig(String ruleIdentifier, Map<String, String> newConfigValues) {
        var tenantRuleConfiguration = getTenantRuleConfiguration(ruleIdentifier);
        var configClass = getConfig(ruleIdentifier);
        if (configClass.isEmpty()) {
            throw new RuntimeException("No config class for rule '%s'".formatted(ruleIdentifier));
        }
        Map<String, String> pick = MapUtils.pick(configClass.get().getDefault().keySet(), newConfigValues);

        if (tenantRuleConfiguration.isPresent()) {
            var c = tenantRuleConfiguration.get();
            c.setConfiguration(pick);
            return saveStoredConfiguration(c);
        } else {
            return saveStoredConfiguration(TenantRuleConfiguration.builder()
                    .ruleIdentifier(ruleIdentifier)
                    .configuration(pick)
                    .build());
        }
    }

    public boolean isParameterized(String id) {
        return ruleIdToConfigClassMap.containsKey(id);
    }

    @Transactional
    public void syncDefinitions() {
        var unsynced = new LinkedHashMap<>(definitions);
        for (var persisted : ruleDefinitionRepository.findAll()) {
            var definition = unsynced.remove(persisted.getId());
            if (definition == null) {
                ruleDefinitionRepository.delete(persisted);
            } else {
                persisted.sync(definition);
            }
        }
        ruleDefinitionRepository.saveAll(unsynced.values().stream()
                .map(definition -> {
                    var added = new com.guided.orci.models.rules.metadata.RuleDefinition();
                    added.sync(definition);
                    return added;
                }).toList());
    }

    public void syncFeatureFlags() {
        ruleFeatureFlagService.ensureRuleFeatureFlagsExist(definitions.keySet());
    }
}
