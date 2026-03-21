const fs = require('fs');
const axios = require('axios');
const { performance } = require('perf_hooks');

const RELATIONAL_BASE = 'http://localhost:13000/api';
const SAMPLE_FILE = '/home/jaeho/workspace/CodeVi/ast_sample/ast_code_package_2026-03-12T17-16-30-857Z.json';

// ═══════════════════════════════════════════════════════
// 벤치마크 설정
// ═══════════════════════════════════════════════════════
const BENCHMARK_ITERATIONS = 30;  // 통계적 유의성을 위해 30회
const WARMUP_ITERATIONS = 5;       // JIT + 캐시 안정화를 위해 5회
const COOLDOWN_MS = 150;           // iteration 간 쿨다운 (ms)

// GC 제어 가능 여부 확인 (node --expose-gc benchmark.js 로 실행 시)
const canGC = typeof global.gc === 'function';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════
// 통계 유틸리티
// ═══════════════════════════════════════════════════════

function calcStats(durations) {
    if (durations.length === 0) return { avg: 0, median: 0, std: 0, min: 0, max: 0, p95: 0, count: 0 };

    const sorted = [...durations].sort((a, b) => a - b);
    const count = sorted.length;
    const avg = sorted.reduce((a, b) => a + b, 0) / count;
    const median = count % 2 === 0
        ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
        : sorted[Math.floor(count / 2)];
    const variance = sorted.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / count;
    const std = Math.sqrt(variance);
    const min = sorted[0];
    const max = sorted[count - 1];
    const p95 = sorted[Math.ceil(count * 0.95) - 1];

    return { avg, median, std, min, max, p95, count };
}

function formatMs(v) { return v.toFixed(2); }

// ═══════════════════════════════════════════════════════
// 측정 함수
// ═══════════════════════════════════════════════════════

async function runStep(name, fn) {
    const start = performance.now();
    try {
        const result = await fn();
        const duration = performance.now() - start;
        console.log(`✅ ${name}: ${duration.toFixed(2)}ms`);
        return { duration, result };
    } catch (e) {
        console.log(`❌ ${name} failed: ${e.response?.status} - ${JSON.stringify(e.response?.data) || e.message}`);
        return { duration: 0, error: e.message };
    }
}

/**
 * 단일 요청 측정 — 클라이언트 E2E 시간과 서버 쿼리 시간을 분리 기록
 */
async function measureOnce(fn) {
    const clientStart = performance.now();
    const response = await fn();
    const clientMs = performance.now() - clientStart;
    const serverMs = response.data?.serverQueryMs ?? null;
    return { clientMs, serverMs };
}

function countNodes(snapshot) {
    const dirs = snapshot.directories || [];
    let files = 0, classes = 0, funcs = 0;

    dirs.forEach(d => {
        files += (d.files || []).length;
        (d.files || []).forEach(f => {
            classes += (f.classes || []).length;
            funcs += (f.fileFunctions || []).length;
            (f.classes || []).forEach(c => {
                funcs += (c.methods || []).length;
            });
        });
    });

    return { directories: dirs.length, files, classes, functions: funcs };
}

// ═══════════════════════════════════════════════════════
// 메인 벤치마크
// ═══════════════════════════════════════════════════════

async function benchmark() {
    console.log('🚀 Starting Quantitative Benchmark (Relational AST Only)...');
    console.log(`   Settings: ${BENCHMARK_ITERATIONS} iterations, ${WARMUP_ITERATIONS} warmups, ${COOLDOWN_MS}ms cooldown`);
    if (canGC) console.log('   ✅ Manual GC enabled (--expose-gc)');
    else console.log('   ⚠️  Manual GC disabled. Run with: node --expose-gc benchmark.js');

    // 1. Loading data
    process.stdout.write('Reading 148MB sample data... ');
    let rawData;
    try {
        rawData = JSON.parse(fs.readFileSync(SAMPLE_FILE, 'utf-8'));
        console.log('Done.');
    } catch (e) {
        console.error('Failed to read sample file:', e.message);
        return;
    }
    const jenkinsJobName = 'benchmark-job-' + Date.now();

    const payload = {
        jenkinsJobName,
        nodes: Array.isArray(rawData) ? rawData : [rawData]
    };

    // 2. Setup (Ensuring TeamProject exists)
    console.log('\n--- Setup (Ensuring TeamProject exists) ---');
    await runStep('Relational: Create Project', () => axios.post(`${RELATIONAL_BASE}/team-projects`, {
        teamName: 'BenchmarkTeam',
        jenkinsJobName,
        sonarProjectKey: 'benchmark-sonar',
        analysis: {
            jobName: jenkinsJobName,
            buildNumber: 1,
            status: 'SUCCESS',
            buildUrl: 'http://dummy',
            commitHash: 'deadbeef'
        },
        astData: {}
    }));

    const results = {
        settings: {
            iterations: BENCHMARK_ITERATIONS,
            warmupIterations: WARMUP_ITERATIONS,
            cooldownMs: COOLDOWN_MS,
            gcEnabled: canGC,
            timestamp: new Date().toISOString()
        },
        save: { relational: 0 },
        get: { relational: 0 },
        counts: { relational: {} },
        queryBenchmark: {
            join: { client: {}, server: {} },
            nested: { client: {}, server: {} }
        }
    };

    // 3. Save Benchmark (Relational Only)
    console.log('\n--- Save (Write) Efficiency ---');
    const relSave = await runStep('Relational: Save AST', () => axios.post(`${RELATIONAL_BASE}/ast-data/relational`, payload, {
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30 * 60 * 1000
    }));
    results.save.relational = relSave.duration;

    // 4. Retrieve Benchmark and Inspect Data
    console.log('\n--- Full Retrieval (Read) Efficiency & Content Stats ---');

    if (relSave.result) {
        const relId = relSave.result.data.id;
        const relGet = await runStep('Relational: Get AST', () => axios.get(`${RELATIONAL_BASE}/ast-data/relational/${relId}`, {
            timeout: 30 * 60 * 1000
        }));
        results.get.relational = relGet.duration;

        const snapshot = relGet.result.data;
        results.counts.relational = countNodes(snapshot);

        // ═══════════════════════════════════════════════════════
        // 5. Natural Join vs Nested SQL — 교차 실행 벤치마크
        // ═══════════════════════════════════════════════════════
        console.log(`\n${'═'.repeat(60)}`);
        console.log('   📊 Query Method Benchmark: Natural Join vs Nested SQL');
        console.log(`${'═'.repeat(60)}`);
        console.log(`   Snapshot ID: ${relId}`);
        console.log(`   Warmup iterations: ${WARMUP_ITERATIONS}`);
        console.log(`   Benchmark iterations: ${BENCHMARK_ITERATIONS}`);
        console.log(`   Cooldown per iteration: ${COOLDOWN_MS}ms`);
        console.log(`   Execution mode: INTERLEAVED (alternating)`);
        console.log(`${'─'.repeat(60)}`);

        const joinFn = () => axios.get(`${RELATIONAL_BASE}/ast-data/relational/benchmark/natural-join/${relId}`, { timeout: 5 * 60 * 1000 });
        const nestedFn = () => axios.get(`${RELATIONAL_BASE}/ast-data/relational/benchmark/nested/${relId}`, { timeout: 5 * 60 * 1000 });

        // ── Warmup (양쪽 균등하게) ──
        console.log(`\n🔥 Warming up (${WARMUP_ITERATIONS} iterations each)...`);
        for (let i = 0; i < WARMUP_ITERATIONS; i++) {
            await joinFn();
            await nestedFn();
            process.stdout.write(`  warmup ${i + 1}/${WARMUP_ITERATIONS}\r`);
        }
        console.log(`  ✅ Warmup complete (${WARMUP_ITERATIONS * 2} total calls)`);

        // GC before benchmark
        if (canGC) {
            global.gc();
            await sleep(200);
        }

        // ── 교차 실행 (Interleaved Execution) ──
        console.log(`\n⏱  Running INTERLEAVED benchmark (${BENCHMARK_ITERATIONS} iterations)...`);

        const joinClientDurations = [];
        const joinServerDurations = [];
        const nestedClientDurations = [];
        const nestedServerDurations = [];

        for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
            // GC before each iteration pair
            if (canGC) global.gc();

            try {
                if (i % 2 === 0) {
                    // 짝수: Join → Nested 순서
                    const j = await measureOnce(joinFn);
                    await sleep(COOLDOWN_MS);
                    const n = await measureOnce(nestedFn);

                    joinClientDurations.push(j.clientMs);
                    if (j.serverMs !== null) joinServerDurations.push(j.serverMs);
                    nestedClientDurations.push(n.clientMs);
                    if (n.serverMs !== null) nestedServerDurations.push(n.serverMs);
                } else {
                    // 홀수: Nested → Join 순서
                    const n = await measureOnce(nestedFn);
                    await sleep(COOLDOWN_MS);
                    const j = await measureOnce(joinFn);

                    joinClientDurations.push(j.clientMs);
                    if (j.serverMs !== null) joinServerDurations.push(j.serverMs);
                    nestedClientDurations.push(n.clientMs);
                    if (n.serverMs !== null) nestedServerDurations.push(n.serverMs);
                }
            } catch (e) {
                console.log(`  ❌ Iteration ${i + 1} failed: ${e.message}`);
            }

            // Cooldown between iteration pairs
            await sleep(COOLDOWN_MS);

            // Progress
            if ((i + 1) % 5 === 0 || i === BENCHMARK_ITERATIONS - 1) {
                process.stdout.write(`  progress: ${i + 1}/${BENCHMARK_ITERATIONS}\r`);
            }
        }
        console.log(`\n  ✅ Benchmark complete.`);

        // ── 통계 계산 ──
        const joinClientStats = calcStats(joinClientDurations);
        const nestedClientStats = calcStats(nestedClientDurations);
        const joinServerStats = calcStats(joinServerDurations);
        const nestedServerStats = calcStats(nestedServerDurations);

        results.queryBenchmark.join.client = joinClientStats;
        results.queryBenchmark.join.server = joinServerStats;
        results.queryBenchmark.nested.client = nestedClientStats;
        results.queryBenchmark.nested.server = nestedServerStats;

        // 데이터 일관성 검증
        console.log('\n🔍 Validating data consistency...');
        try {
            const joinResp = await joinFn();
            const nestedResp = await nestedFn();
            const joinData = joinResp.data.data;
            const nestedData = nestedResp.data.data;

            const joinCounts = countNodes(joinData);
            const nestedCounts = countNodes(nestedData);

            const isConsistent =
                joinCounts.directories === nestedCounts.directories &&
                joinCounts.files === nestedCounts.files &&
                joinCounts.classes === nestedCounts.classes &&
                joinCounts.functions === nestedCounts.functions;

            console.log(`   JOIN    → dirs: ${joinCounts.directories}, files: ${joinCounts.files}, classes: ${joinCounts.classes}, funcs: ${joinCounts.functions}`);
            console.log(`   Nested  → dirs: ${nestedCounts.directories}, files: ${nestedCounts.files}, classes: ${nestedCounts.classes}, funcs: ${nestedCounts.functions}`);
            console.log(`   ${isConsistent ? '✅ Data is CONSISTENT — both methods return identical counts.' : '⚠️  Data MISMATCH — counts differ between methods!'}`);
        } catch (e) {
            console.log(`   ❌ Validation failed: ${e.message}`);
        }

        // ── 결과 출력 ──
        console.log(`\n${'═'.repeat(60)}`);
        console.log('   📊 Query Benchmark Results — Client E2E Time');
        console.log(`${'═'.repeat(60)}`);
        console.table({
            'Avg (ms)': { 'Natural Join': formatMs(joinClientStats.avg), 'Nested SQL': formatMs(nestedClientStats.avg), Winner: joinClientStats.avg < nestedClientStats.avg ? '🏆 Natural Join' : '🏆 Nested SQL' },
            'Median (ms)': { 'Natural Join': formatMs(joinClientStats.median), 'Nested SQL': formatMs(nestedClientStats.median), Winner: joinClientStats.median < nestedClientStats.median ? '🏆 Natural Join' : '🏆 Nested SQL' },
            'Std Dev (ms)': { 'Natural Join': formatMs(joinClientStats.std), 'Nested SQL': formatMs(nestedClientStats.std) },
            'P95 (ms)': { 'Natural Join': formatMs(joinClientStats.p95), 'Nested SQL': formatMs(nestedClientStats.p95) },
            'Min (ms)': { 'Natural Join': formatMs(joinClientStats.min), 'Nested SQL': formatMs(nestedClientStats.min) },
            'Max (ms)': { 'Natural Join': formatMs(joinClientStats.max), 'Nested SQL': formatMs(nestedClientStats.max) },
        });

        if (joinServerStats.count > 0 && nestedServerStats.count > 0) {
            console.log(`\n${'═'.repeat(60)}`);
            console.log('   📊 Query Benchmark Results — Server Query Time (순수 쿼리)');
            console.log(`${'═'.repeat(60)}`);
            console.table({
                'Avg (ms)': { 'Natural Join': formatMs(joinServerStats.avg), 'Nested SQL': formatMs(nestedServerStats.avg), Winner: joinServerStats.avg < nestedServerStats.avg ? '🏆 Natural Join' : '🏆 Nested SQL' },
                'Median (ms)': { 'Natural Join': formatMs(joinServerStats.median), 'Nested SQL': formatMs(nestedServerStats.median), Winner: joinServerStats.median < nestedServerStats.median ? '🏆 Natural Join' : '🏆 Nested SQL' },
                'Std Dev (ms)': { 'Natural Join': formatMs(joinServerStats.std), 'Nested SQL': formatMs(nestedServerStats.std) },
                'P95 (ms)': { 'Natural Join': formatMs(joinServerStats.p95), 'Nested SQL': formatMs(nestedServerStats.p95) },
                'Min (ms)': { 'Natural Join': formatMs(joinServerStats.min), 'Nested SQL': formatMs(nestedServerStats.min) },
                'Max (ms)': { 'Natural Join': formatMs(joinServerStats.max), 'Nested SQL': formatMs(nestedServerStats.max) },
            });

            // HTTP 오버헤드 분석
            const joinOverhead = joinClientStats.avg - joinServerStats.avg;
            const nestedOverhead = nestedClientStats.avg - nestedServerStats.avg;
            console.log(`\n📡 HTTP Overhead (avg): Join ${formatMs(joinOverhead)}ms, Nested ${formatMs(nestedOverhead)}ms`);
        }

        // 결론
        const clientRatio = (Math.max(joinClientStats.avg, nestedClientStats.avg) / Math.min(joinClientStats.avg, nestedClientStats.avg)).toFixed(2);
        const clientWinner = joinClientStats.avg < nestedClientStats.avg ? 'Natural Join' : 'Nested SQL';
        console.log(`\n💡 결론 (Client E2E): ${clientWinner} 방식이 평균 ${clientRatio}배 빠름`);

        if (joinServerStats.count > 0 && nestedServerStats.count > 0) {
            const serverRatio = (Math.max(joinServerStats.avg, nestedServerStats.avg) / Math.min(joinServerStats.avg, nestedServerStats.avg)).toFixed(2);
            const serverWinner = joinServerStats.avg < nestedServerStats.avg ? 'Natural Join' : 'Nested SQL';
            console.log(`💡 결론 (Server Query): ${serverWinner} 방식이 평균 ${serverRatio}배 빠름`);
        }
    }

    // 최종 결과 요약
    console.log('\n📊 Relational Benchmark Summary:');
    console.table({
        'Save Time (Write)': { Relational: `${results.save.relational.toFixed(2)} ms` },
        'Full Fetch Time (Read)': { Relational: `${results.get.relational.toFixed(2)} ms` },
        'Stored Files': { Relational: results.counts.relational.files },
        'Stored Functions': { Relational: results.counts.relational.functions }
    });

    console.log('\n💡 Analysis:');
    console.log('- Relational stores only structural metadata (Directory/File/Class/Function).');
    console.log(`- Data reduction ratio: approx 148MB JSON -> structural relational snapshot.`);

    // ═══════════════════════════════════════════════════════
    // 6. Save Results to File
    // ═══════════════════════════════════════════════════════
    const resultsDir = './results';
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const resultFilePath = `${resultsDir}/benchmark_${timestamp}.json`;

    fs.writeFileSync(resultFilePath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Benchmark results saved to: ${resultFilePath}`);
}

benchmark();
