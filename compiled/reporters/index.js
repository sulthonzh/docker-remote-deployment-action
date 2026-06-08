import { Logger } from '../utils/logger';
class ConsoleReporter {
    async generate(results, outputFile) {
        const logger = new Logger();
        const passed = results.filter(r => r.status === 'passed').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const total = results.length;
        console.log('\n=== Agent Sandbox Probe Results ===');
        console.log(`✅ Passed: ${passed}/${total}`);
        console.log(`❌ Failed: ${failed}/${total}`);
        console.log(`⏱️  Total duration: ${Math.max(...results.map(r => r.duration))}ms`);
        console.log('');
        results.forEach(result => {
            const statusIcon = result.status === 'passed' ? '✅' : '❌';
            const duration = `${result.duration}ms`;
            console.log(`${statusIcon} ${result.name} (${duration})`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            if (result.evidence) {
                console.log(`   Evidence: ${JSON.stringify(result.evidence, null, 2)}`);
            }
        });
    }
}
class JsonReporter {
    async generate(results, outputFile) {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: results.length,
                passed: results.filter(r => r.status === 'passed').length,
                failed: results.filter(r => r.status === 'failed').length
            },
            results: results
        };
        const output = JSON.stringify(report, null, 2);
        if (outputFile) {
            const fs = await import('fs/promises');
            await fs.writeFile(outputFile, output);
        }
        else {
            console.log(output);
        }
    }
}
class JunitReporter {
    async generate(results, outputFile) {
        const testsuites = results.map(result => ({
            $: {
                name: result.name,
                tests: '1',
                failures: result.status === 'failed' ? '1' : '0',
                errors: '0',
                time: (result.duration / 1000).toFixed(3)
            },
            testcase: [{
                    $: {
                        name: result.name,
                        classname: 'agent-sandbox-probe',
                        time: (result.duration / 1000).toFixed(3)
                    }
                }]
        }));
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
${testsuites.map(suite => `  <testsuite name="${suite.$.name}">
${suite.testcase.map(test => `    <testcase name="${test.$.name}" classname="${test.$.classname}" time="${test.$.time}">
${test.$.failures === '1' ? `      <failure message="${results.find(r => r.name === test.$.name)?.error}"/>
` : ''}    </testcase>`).join('\n')}
  </testsuite>`).join('\n')}
</testsuites>`;
        if (outputFile) {
            const fs = await import('fs/promises');
            await fs.writeFile(outputFile, xml);
        }
        else {
            console.log(xml);
        }
    }
}
class GitHubActionsReporter {
    async generate(results, outputFile) {
        results.forEach(result => {
            const conclusion = result.status === 'passed' ? 'success' : 'failure';
            const title = result.status === 'passed' ? `✅ ${result.name}` : `❌ ${result.name}`;
            const message = result.error || 'Probe executed successfully';
            console.log(`::notice title=${title}::${message}`);
        });
    }
}
export const reporters = {
    console: new ConsoleReporter(),
    json: new JsonReporter(),
    junit: new JunitReporter(),
    github: new GitHubActionsReporter()
};
//# sourceMappingURL=index.js.map