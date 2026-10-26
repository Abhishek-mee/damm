#!/usr/bin/env node
/**
 * Verify that every free OpenRouter model assigned to an agent can actually
 * call a tool. A model that cannot call tools cannot drive an OpenCode agent.
 *
 * Usage:
 *   node scripts/check-models.mjs             # test every assigned model
 *   node scripts/check-models.mjs --dry-run   # print assignments, no network
 *   node scripts/check-models.mjs --model openrouter/vendor/model:free
 *
 * The key is read from .env.local or OPENROUTER_API_KEY. It is never printed.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENDPOINT = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const only = args.includes('--model') ? args[args.indexOf('--model') + 1] : null;
const timeoutArg = args.find((arg) => arg.startsWith('--timeout='));
const timeoutMs = timeoutArg ? Number(timeoutArg.split('=')[1]) : 60000;

function readEnvFile() {
  const file = path.join(ROOT, '.env.local');
  if (!fs.existsSync(file)) return {};
  const values = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return values;
}

function agentModels() {
  const directory = path.join(ROOT, '.opencode', 'agents');
  const assignments = new Map();
  if (!fs.existsSync(directory)) return assignments;

  for (const file of fs.readdirSync(directory).filter((name) => name.endsWith('.md')).sort()) {
    const text = fs.readFileSync(path.join(directory, file), 'utf8');
    const model = text.match(/^model:\s*"?'?([^"'\r\n]+)"?'?$/m)?.[1]?.trim();
    if (!model) continue;
    if (!assignments.has(model)) assignments.set(model, []);
    assignments.get(model).push(file.slice(0, -3));
  }

  return assignments;
}

function cleanMessage(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .slice(0, 160);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pingModel(model, key) {
  const payload = {
    model: model.replace(/^openrouter\//, ''),
    messages: [
      {
        role: 'user',
        content: 'Call the ping tool with value 42. Use the tool, do not reply with text.',
      },
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'ping',
          description: 'Return the supplied integer.',
          parameters: {
            type: 'object',
            properties: { value: { type: 'integer' } },
            required: ['value'],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: 'function', function: { name: 'ping' } },
    max_tokens: 64,
    temperature: 0,
  };

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const started = Date.now();
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/Abhishek-mee/damm',
          'X-Title': 'DAMM model check',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });

      const elapsed = Date.now() - started;
      const text = await response.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        // Keep the raw text for the error message.
      }

      if (!response.ok) {
        const detail = cleanMessage(data?.error?.message || text || response.statusText);
        if ((response.status === 429 || response.status >= 500) && attempt === 1) {
          await delay(2500);
          continue;
        }
        return { model, ok: false, elapsed, note: `HTTP ${response.status}: ${detail}` };
      }

      const message = data?.choices?.[0]?.message;
      const call = message?.tool_calls?.find((item) => item?.function?.name === 'ping');
      if (!call) {
        const reason = data?.choices?.[0]?.finish_reason || 'no tool call';
        return { model, ok: false, elapsed, note: `model replied without calling ping (${reason})` };
      }

      try {
        JSON.parse(call.function.arguments || '{}');
      } catch {
        return { model, ok: false, elapsed, note: 'tool arguments were not valid JSON' };
      }

      return { model, ok: true, elapsed, note: 'tool call ok' };
    } catch (error) {
      const elapsed = Date.now() - started;
      const message = error?.name === 'TimeoutError' ? `timed out after ${timeoutMs}ms` : cleanMessage(error?.message);
      if (attempt === 1) {
        await delay(1000);
        continue;
      }
      return { model, ok: false, elapsed, note: message };
    }
  }

  return { model, ok: false, elapsed: 0, note: 'unknown failure' };
}

async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function runner() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}

async function main() {
  const assignments = agentModels();
  if (assignments.size === 0) {
    console.error('No agent models found in .opencode/agents/.');
    process.exitCode = 1;
    return;
  }

  let models = [...assignments.keys()];
  if (only) {
    if (!models.includes(only)) {
      console.error(`Model "${only}" is not assigned to an agent.`);
      process.exitCode = 1;
      return;
    }
    models = [only];
  }

  console.log('DAMM model check');
  console.log(`  models: ${models.length}`);
  console.log('');

  for (const model of models) {
    console.log(`  ${model}`);
    console.log(`    agents: ${assignments.get(model).join(', ')}`);
  }
  console.log('');

  if (dryRun) {
    console.log('Dry run: no network request made. Remove --dry-run to test tool calls.');
    return;
  }

  const env = { ...readEnvFile(), ...process.env };
  const key = env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    console.error('OPENROUTER_API_KEY is not set.');
    console.error('Add it to .env.local (gitignored), then run this again.');
    process.exitCode = 1;
    return;
  }
  if (!key.startsWith('sk-or-v1-')) {
    console.error('OPENROUTER_API_KEY does not look like an OpenRouter key (expected sk-or-v1-...).');
    process.exitCode = 1;
    return;
  }

  const results = await pool(models, 2, (model) => pingModel(model, key));
  let failed = 0;

  for (const result of results) {
    const status = result.ok ? 'PASS' : 'FAIL';
    if (!result.ok) failed += 1;
    console.log(`${status}  ${result.model}  ${result.elapsed}ms`);
    if (!result.ok) console.log(`      ${cleanMessage(result.note)}`);
  }

  console.log('');
  if (failed === 0) {
    console.log(`PASS  ${results.length} model${results.length === 1 ? '' : 's'} can call tools`);
    return;
  }

  console.log(`FAIL  ${failed} of ${results.length} model${results.length === 1 ? '' : 's'} failed`);
  console.log('');
  console.log('Fix: change the model line in the affected agent file, then re-run:');
  console.log('  node scripts/check-models.mjs');
  console.log('Fallback: openrouter/free');
  process.exitCode = 1;
}

main();
