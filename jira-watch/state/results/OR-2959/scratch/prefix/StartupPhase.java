package com.guided.orci.spring;

public enum StartupPhase {
    ACQUIRE_INIT_LOCK(-100),
    INITIALIZE_TENANTS(-99),
    INITIALIZE_APP_DATA(-98),
    CREATE_ADMIN_USER(-97),
    CREATE_DEFAULT_USER(-96),
    COMPLIANCE_RESULT_EVAL(-10),
    JOB_CLEANER(-10),
    RELEASE_INIT_LOCK(-1);

    private final int phase;

    StartupPhase(int phase) {
        this.phase = phase;
    }

    public int getPhase() {
        return phase;
    }
}
