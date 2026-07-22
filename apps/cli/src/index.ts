#!/usr/bin/env node
import { createCli } from './cli.js';

const cli = await createCli();
const result = await cli.run(process.argv.slice(2));
await cli.shutdown();
process.exit(result.exitCode);
