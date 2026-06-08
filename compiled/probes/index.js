import { PathTraversalProbe } from './path-traversal-probe';
import { NetworkEscapeProbe } from './network-escape-probe';
import { DenylistBypassProbe } from './denylist-bypass-probe';
export const availableProbes = [
    new PathTraversalProbe(),
    new NetworkEscapeProbe(),
    new DenylistBypassProbe()
];
export default availableProbes;
//# sourceMappingURL=index.js.map