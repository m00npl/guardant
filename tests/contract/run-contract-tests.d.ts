#!/usr/bin/env bun
/**
 * Contract test runner for GuardAnt services
 * Executes all contract tests and generates Pact files
 */
declare class ContractTestRunner {
    private results;
    private pactDir;
    private logsDir;
    constructor();
    private ensureDirectories;
    runAllTests(): Promise<boolean>;
    private runTest;
    private printSummary;
    publishPacts(): Promise<void>;
    verifyPacts(): Promise<boolean>;
}
export { ContractTestRunner };
//# sourceMappingURL=run-contract-tests.d.ts.map