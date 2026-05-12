#!/usr/bin/env node
import { createCli } from "../src/cli/cli.js";

const argv = process.argv[2] === "--" ? [process.argv[0], process.argv[1], ...process.argv.slice(3)] : process.argv;

createCli().parseAsync(argv);
