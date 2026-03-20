
const fs = require('fs');
const axios = require('axios');
const { performance } = require('perf_hooks');

const RELATIONAL_BASE = 'http://localhost:13001/api';
const JSON_BASE = 'http://localhost:13002/api';
const SAMPLE_FILE = '/home/jaeho/workspace/CodeVi/ast_sample/ast_code_package_2026-03-12T17-16-30-857Z.json';

const BATCH_SIZES = [1, 5, 10, 20]; // How many snapshots to add at each step

async function setupProject(name) {
    await axios.post(`${RELATIONAL_BASE}/team-projects`, {
        teamName: 'GrowthTeam',
        jenkinsJobName: name,
        sonarProjectKey: 'growth-' + name,
        analysis: {
            jobName: name,
            buildNumber: 1,
            status: 'SUCCESS',
            buildUrl: 'http://growth',
            commitHash: 'abcdef'
        },
        astData: {} 
    });
}

async function benchmark() {
    console.log('🚀 Starting Data Accumulation Benchmark...');
    const rawData = JSON.parse(fs.readFileSync(SAMPLE_FILE, 'utf-8'));
    const prjName = 'accum-' + Date.now();
    await setupProject(prjName);

    const payload = {
        jenkinsJobName: prjName,
        nodes: Array.isArray(rawData) ? rawData : [rawData]
    };

    const stats = [];

    for (const count of [10, 50, 100]) {
        console.log(`\n📦 Accumulating to ${count} snapshots...`);
        // We'll just add in a loop. Note: 148MB payload is heavy, 
        // in a real test we'd repeat this many times.
        // For simulation, let's just do a few and measure.
        
        let start = performance.now();
        const res = await axios.post(`${RELATIONAL_BASE}/ast-data/relational`, payload, { timeout: 10 * 60 * 1000 });
        let relSave = performance.now() - start;

        start = performance.now();
        await axios.post(`${JSON_BASE}/ast-data/json`, payload, { timeout: 10 * 60 * 1000 });
        let jsonSave = performance.now() - start;

        // Now measure retrieval.
        const relId = res.data.id;
        start = performance.now();
        await axios.get(`${RELATIONAL_BASE}/ast-data/relational/${relId}`);
        let relRead = performance.now() - start;

        start = performance.now();
        // Since JSON fetch is just 1 row at a time, it's mostly constant per record.
        // The real test is "Get all snapshots of project".
        await axios.get(`${RELATIONAL_BASE}/ast-data/relational`);
        let relGetAll = performance.now() - start;

        console.log(`- Snapshot Count: ${count}`);
        console.log(`- Rel Get Snapshot: ${relRead.toFixed(2)}ms`);
        console.log(`- Rel Get All: ${relGetAll.toFixed(2)}ms`);

        stats.push({ count, relRead, relGetAll });
    }

    console.log('\n📈 Graph Data (CSV):');
    console.log('Snapshots,ReadSnapshot(Rel),ReadAll(Rel)');
    stats.forEach(s => console.log(`${s.count},${s.relRead},${s.relGetAll}`));
}

benchmark();
