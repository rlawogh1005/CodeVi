
const fs = require('fs');
const axios = require('axios');
const { performance } = require('perf_hooks');

const RELATIONAL_BASE = 'http://localhost:13001/api';
const JSON_BASE = 'http://localhost:13002/api';
const SAMPLE_FILE = '/home/jaeho/workspace/CodeVi/ast_sample/ast_code_package_2026-03-12T17-16-30-857Z.json';

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

async function benchmark() {
    console.log('🚀 Starting Quantitative Benchmark...');

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

    // 2. Setup (Required by Relational)
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
        save: { relational: 0, json: 0 },
        get: { relational: 0, json: 0 },
        counts: { relational: {}, json: {} }
    };

    // 3. Save Benchmark
    console.log('\n--- Save (Write) Efficiency ---');
    
    // JSON
    const jsonSave = await runStep('JSON: Save AST', () => axios.post(`${JSON_BASE}/ast-data/json`, payload, { 
        maxContentLength: Infinity, 
        maxBodyLength: Infinity,
        timeout: 10 * 60 * 1000
    }));
    results.save.json = jsonSave.duration;

    // Relational
    const relSave = await runStep('Relational: Save AST', () => axios.post(`${RELATIONAL_BASE}/ast-data/relational`, payload, { 
        maxContentLength: Infinity, 
        maxBodyLength: Infinity,
        timeout: 30 * 60 * 1000
    }));
    results.save.relational = relSave.duration;

    // 4. Retrieve Benchmark and Inspect Data
    console.log('\n--- Full Retrieval (Read) Efficiency & Content Stats ---');
    
    if (jsonSave.result) {
        const jsonId = jsonSave.result.data.id;
        const jsonGet = await runStep('JSON: Get AST', () => axios.get(`${JSON_BASE}/ast-data/json/${jsonId}`, {
            timeout: 10 * 60 * 1000
        }));
        results.get.json = jsonGet.duration;
        // JSON is just 1 blob. Size in MB:
        const str = JSON.stringify(jsonGet.result.data.astContent);
        results.counts.json.sizeMB = (str.length / (1024 * 1024)).toFixed(2);
    }

    if (relSave.result) {
        const relId = relSave.result.data.id;
        const relGet = await runStep('Relational: Get AST', () => axios.get(`${RELATIONAL_BASE}/ast-data/relational/${relId}`, {
            timeout: 30 * 60 * 1000
        }));
        results.get.relational = relGet.duration;
        
        // Inspect counts
        const snapshot = relGet.result.data;
        const dirs = snapshot.directories || [];
        let files = 0;
        let classes = 0;
        let funcs = 0;

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

        results.counts.relational = {
            directories: dirs.length,
            files,
            classes,
            functions: funcs
        };
    }

    console.log('\n📊 Quantitative Comparison:');
    console.table({
        'Save Time (ms)': { Relational: results.save.relational.toFixed(2), JSON: results.save.json.toFixed(2) },
        'Full Fetch Time (ms)': { Relational: results.get.relational.toFixed(2), JSON: results.get.json.toFixed(2) },
        'Stored Object (Count/Size)': { 
            Relational: `${results.counts.relational.files} files, ${results.counts.relational.functions} funcs`, 
            JSON: `${results.counts.json.sizeMB} MB` 
        }
    });

    console.log('\n💡 Analysis:');
    console.log('- Relational stores only structural metadata (Directory/File/Class/Function).');
    console.log('- JSON stores the ENTIRE Tree-sitter AST (every leaf node, literal, identifier).');
    console.log(`- Data reduction ratio for relational: approx 148MB -> structural snapshot.`);
}

benchmark();
