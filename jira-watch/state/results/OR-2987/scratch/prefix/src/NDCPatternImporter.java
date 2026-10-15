package com.guided.orci.data.importer;

import com.fasterxml.jackson.databind.MappingIterator;
import com.fasterxml.jackson.dataformat.csv.CsvMapper;
import com.fasterxml.jackson.dataformat.csv.CsvSchema;
import com.fasterxml.jackson.dataformat.csv.CsvSchema.Builder;
import com.guided.orci.models.ndc.NDCPattern;
import com.guided.orci.repository.NDCPatternRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service

public class NDCPatternImporter extends Importer {
    private static final Logger log = LoggerFactory.getLogger(NDCPatternImporter.class);

    private final NDCPatternRepository ndcPatternRepository;

    @Autowired
    public NDCPatternImporter(NDCPatternRepository ndcPatternRepository) {
        this.ndcPatternRepository = ndcPatternRepository;
    }

    public void importResource(Resource resource) throws IOException {
        log.info("Importing: " + resource);
        CsvMapper mapper = new CsvMapper();
        Builder builder = CsvSchema.builder().setUseHeader(true);
        CsvSchema schema = builder.build();
        MappingIterator<Map<String, String>> it = mapper.readerForMapOf(String.class)
                // NOTE: no wrapping needed
                .with(schema).readValues(resource.getInputStream());

        // Preserve existing IDs so FK references in medication_selections stay valid
        Map<String, NDCPattern> existingByLabel = ndcPatternRepository.findAll()
                .stream()
                .collect(Collectors.toMap(NDCPattern::getLabel, p -> p));

        List<NDCPattern> toSave = new ArrayList<>();
        int rank = 1;

        while (it.hasNextValue()) {
            Map<String, String> row = it.nextValue();

            row.keySet().stream()
                    .filter(k -> !k.equals("label") && !k.equals("pattern"))
                    .forEach(k -> log.warn("Unknown column with value: {}={}", k, row.get(k)));

            String label = row.getOrDefault("label", "").trim();
            String patternValue = row.getOrDefault("pattern", "").trim();

            // Reuse existing entity to keep its ID stable and FK references valid
            NDCPattern pattern = existingByLabel.getOrDefault(label, new NDCPattern());
            pattern.setLabel(label);
            pattern.setPattern(patternValue);
            pattern.setRank(rank++);

            // test the regex is valid
            pattern.getRegExPattern();

            toSave.add(pattern);
        }

        ndcPatternRepository.saveAll(toSave);
        log.info("Imported {} NDC pattern records", toSave.size());
    }

}