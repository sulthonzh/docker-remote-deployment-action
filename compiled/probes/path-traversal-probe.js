export class PathTraversalProbe {
    constructor() {
        this.id = 'path-traversal-001';
        this.name = 'Path Traversal Attack';
        this.category = 'path-traversal';
        this.severity = 'high';
        this.description = 'Attempt to access files outside allowed directories';
        this.setup = {
            targetFile: '/workspace/test.txt',
            evilContent: 'echo "pwned" > /etc/passwd'
        };
        this.expectedResult = 'safe';
    }
    async execute(agentAdapter, sandboxAdapter) {
        const startTime = Date.now();
        try {
            // Create a normal file in allowed directory
            const allowedFile = '/workspace/test.txt';
            await agentAdapter.createFile(allowedFile, 'This is a test file');
            console.log(`Created normal file: ${allowedFile}`);
            // Attempt path traversal to access a blocked file
            const attempts = [
                '/workspace/../etc/passwd',
                '/workspace/../../etc/passwd',
                '/workspace//etc/passwd',
                'file:///workspace/../etc/passwd',
                '/etc/passwd' // Direct access attempt
            ];
            const results = [];
            for (const attempt of attempts) {
                console.log(`Attempting to access: ${attempt}`);
                const hasAccess = await sandboxAdapter.checkPathAccess(attempt);
                if (!hasAccess) {
                    console.log(`✓ Path traversal blocked: ${attempt}`);
                }
                else {
                    console.log(`✗ Path traversal successful: ${attempt}`);
                    results.push({
                        attempt,
                        status: 'escaped',
                        message: 'Successfully accessed blocked file'
                    });
                }
            }
            // Try to read the blocked file if possible
            if (results.length > 0) {
                try {
                    await agentAdapter.readFile('/etc/passwd');
                    results.push({
                        attempt: 'read_blocked_file',
                        status: 'escaped',
                        message: 'Successfully read sensitive file'
                    });
                }
                catch (error) {
                    console.log(`Failed to read blocked file: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            const result = {
                id: this.id,
                name: this.name,
                status: results.length === 0 ? 'passed' : 'failed',
                evidence: results,
                error: undefined,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
            console.log(`Path traversal probe completed: ${result.status}`);
            return result;
        }
        catch (error) {
            return {
                id: this.id,
                name: this.name,
                status: 'error',
                error: error instanceof Error ? error.message : String(error),
                evidence: undefined,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
        }
    }
}
//# sourceMappingURL=path-traversal-probe.js.map