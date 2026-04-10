export interface LogHeader {
  key: string;
  value: string;
}

export interface LogEntry {
  id: string;
  type: 'request' | 'response' | 'error' | 'lifecycle' | 'heartbeat' | 'info' | 'raw';
  timestamp?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  headers?: LogHeader[];
  body?: string;
  extras?: Record<string, string>;
  errorType?: string;
  errorMessage?: string;
  rawLines: string[];
  lineStart: number;
  lineEnd: number;
}

export interface ParsedLog {
  deviceInfo: string;
  entries: LogEntry[];
  stats: LogStats;
}

export interface LogStats {
  totalRequests: number;
  totalResponses: number;
  totalErrors: number;
  statusCodes: Record<number, number>;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  responseTimes: { url: string; time: number; status: number; timestamp?: string }[];
  endpoints: Record<string, { count: number; avgTime: number; errors: number; times: number[] }>;
  lifecycleEvents: { state: string; index: number }[];
  timeRange: { start?: string; end?: string };
  errorRate: number;
}

function stripPrefix(line: string): string {
  return line.replace(/^I\/flutter\s*\(\d+\):\s?/, '').replace(/^[║╟╚╔╗╝╠╣─═│┌┐└┘├┤┬┴┼▶]+\s?/, '');
}

function extractUrl(lines: string[], startIdx: number): string | undefined {
  for (let i = startIdx; i < Math.min(startIdx + 3, lines.length); i++) {
    const stripped = stripPrefix(lines[i]).trim();
    const urlMatch = stripped.match(/(https?:\/\/[^\s"']+)/);
    if (urlMatch) return urlMatch[1];
  }
  return undefined;
}

function collectSection(lines: string[], startIdx: number): { content: string[]; endIdx: number } {
  const content: string[] = [];
  let i = startIdx;
  while (i < lines.length) {
    const line = lines[i];
    if (line.includes('╚═')) {
      i++;
      break;
    }
    content.push(stripPrefix(line).trim());
    i++;
  }
  return { content, endIdx: i };
}

function parseHeaders(content: string[]): LogHeader[] {
  const headers: LogHeader[] = [];
  let currentKey = '';
  let currentValue = '';

  for (const line of content) {
    const clean = line.replace(/^[╟║╔╚═\s]+/, '').trim();
    if (!clean || clean.startsWith('Headers')) continue;

    const headerMatch = clean.match(/^([^:]+):\s*(.*)/);
    if (headerMatch) {
      if (currentKey) {
        headers.push({ key: currentKey, value: currentValue.trim() });
      }
      currentKey = headerMatch[1].trim();
      currentValue = headerMatch[2];
    } else if (currentKey) {
      currentValue += ' ' + clean;
    }
  }
  if (currentKey) {
    headers.push({ key: currentKey, value: currentValue.trim() });
  }
  return headers;
}

function parseBody(content: string[]): string {
  const bodyLines: string[] = [];
  for (const line of content) {
    const clean = line.replace(/^[╟║╔╚═\s]+/, '');
    if (clean.trim() === 'Body' || clean.trim() === 'Body ') continue;
    if (clean.trim()) bodyLines.push(clean);
  }
  return bodyLines.join('\n');
}

function parseExtras(content: string[]): Record<string, string> {
  const extras: Record<string, string> = {};
  for (const line of content) {
    const clean = line.replace(/^[╟║╔╚═\s]+/, '').trim();
    if (!clean || clean.startsWith('Extras')) continue;
    const match = clean.match(/^([^:]+):\s*(.*)/);
    if (match) {
      extras[match[1].trim()] = match[2].trim();
    }
  }
  return extras;
}

export function parseFlutterLog(rawText: string): ParsedLog {
  const lines = rawText.split('\n');
  const entries: LogEntry[] = [];
  let deviceInfo = '';
  let entryId = 0;

  const lifecycleEvents: { state: string; index: number }[] = [];
  const allResponseTimes: { url: string; time: number; status: number; timestamp?: string }[] = [];
  const statusCodes: Record<number, number> = {};
  const endpoints: Record<string, { count: number; avgTime: number; errors: number; times: number[] }> = {};
  let totalRequests = 0;
  let totalResponses = 0;
  let totalErrors = 0;
  let firstTimestamp: string | undefined;
  let lastTimestamp: string | undefined;

  // Device info
  const deviceMatch = rawText.match(/Showing (.+) logs:/);
  if (deviceMatch) deviceInfo = deviceMatch[1].trim();

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const stripped = line.replace(/^I\/flutter\s*\(\d+\):\s?/, '').trim();

    // Lifecycle events
    const lifecycleMatch = stripped.match(/Lifecycle:\s*(AppLifecycleState\.\w+)/);
    if (lifecycleMatch) {
      lifecycleEvents.push({ state: lifecycleMatch[1], index: i });
      entries.push({
        id: `entry-${entryId++}`,
        type: 'lifecycle',
        rawLines: [line],
        lineStart: i,
        lineEnd: i,
        body: lifecycleMatch[1],
      });
      i++;
      continue;
    }

    // Heartbeat events
    if (stripped.includes('heartbeat timer') || stripped.includes('Heartbeat')) {
      const heartbeatType = stripped.includes('Starting') ? 'start' : stripped.includes('Stopping') ? 'stop' : 'error';
      entries.push({
        id: `entry-${entryId++}`,
        type: 'heartbeat',
        rawLines: [line],
        lineStart: i,
        lineEnd: i,
        body: stripped,
        errorMessage: heartbeatType === 'error' ? stripped : undefined,
      });
      i++;
      continue;
    }

    // Request entry
    const requestMatch = stripped.match(/╔╣\s*Request\s*║\s*(GET|POST|PUT|DELETE|PATCH)/);
    if (requestMatch) {
      totalRequests++;
      const method = requestMatch[1];
      const entryStartLine = i;
      const rawLines: string[] = [line];
      i++;

      const url = extractUrl(lines, i);

      // Skip to closing line of the URL box
      while (i < lines.length && !lines[i].includes('╚═')) {
        rawLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) { rawLines.push(lines[i]); i++; }

      let headers: LogHeader[] = [];
      let body = '';
      let extras: Record<string, string> = {};

      // Parse subsequent sections (Headers, Body, Extras)
      while (i < lines.length) {
        const nextLine = lines[i]?.replace(/^I\/flutter\s*\(\d+\):\s?/, '').trim();
        if (!nextLine) { rawLines.push(lines[i]); i++; continue; }

        if (nextLine.includes('╔') && nextLine.includes('Headers')) {
          rawLines.push(lines[i]); i++;
          const section = collectSection(lines, i);
          headers = parseHeaders(section.content);
          for (let j = i; j < section.endIdx; j++) rawLines.push(lines[j]);
          i = section.endIdx;
        } else if (nextLine.includes('╔') && nextLine.includes('Extras')) {
          rawLines.push(lines[i]); i++;
          const section = collectSection(lines, i);
          extras = parseExtras(section.content);
          for (let j = i; j < section.endIdx; j++) rawLines.push(lines[j]);
          i = section.endIdx;
        } else if (nextLine.includes('╔') && nextLine.includes('Body')) {
          rawLines.push(lines[i]); i++;
          const section = collectSection(lines, i);
          body = parseBody(section.content);
          for (let j = i; j < section.endIdx; j++) rawLines.push(lines[j]);
          i = section.endIdx;
        } else if (nextLine.startsWith('║') && !nextLine.includes('╔╣')) {
          // Continuation body without header
          const section = collectSection(lines, i);
          const additionalBody = parseBody(section.content);
          if (additionalBody && !body) body = additionalBody;
          for (let j = i; j < section.endIdx; j++) rawLines.push(lines[j]);
          i = section.endIdx;
        } else {
          break;
        }
      }

      const timestamp = extras['startTime'];
      if (timestamp) {
        if (!firstTimestamp || timestamp < firstTimestamp) firstTimestamp = timestamp;
        if (!lastTimestamp || timestamp > lastTimestamp) lastTimestamp = timestamp;
      }

      // Track endpoint
      if (url) {
        const endpoint = url.replace(/https?:\/\/[^/]+/, '');
        if (!endpoints[endpoint]) {
          endpoints[endpoint] = { count: 0, avgTime: 0, errors: 0, times: [] };
        }
        endpoints[endpoint].count++;
      }

      entries.push({
        id: `entry-${entryId++}`,
        type: 'request',
        method,
        url,
        headers,
        body: body || undefined,
        extras: Object.keys(extras).length > 0 ? extras : undefined,
        timestamp,
        rawLines,
        lineStart: entryStartLine,
        lineEnd: i - 1,
      });
      continue;
    }

    // Response entry
    const responseMatch = stripped.match(/╔╣\s*Response\s*║\s*(GET|POST|PUT|DELETE|PATCH)\s*║\s*Status:\s*(\d+)\s*║?\s*Time:\s*(\d+)\s*ms/);
    if (responseMatch) {
      totalResponses++;
      const method = responseMatch[1];
      const statusCode = parseInt(responseMatch[2]);
      const responseTime = parseInt(responseMatch[3]);
      const entryStartLine = i;
      const rawLines: string[] = [line];
      i++;

      const url = extractUrl(lines, i);

      statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;

      if (url) {
        const endpoint = url.replace(/https?:\/\/[^/]+/, '');
        if (!endpoints[endpoint]) {
          endpoints[endpoint] = { count: 0, avgTime: 0, errors: 0, times: [] };
        }
        endpoints[endpoint].times.push(responseTime);
        if (statusCode >= 400) endpoints[endpoint].errors++;
      }

      allResponseTimes.push({ url: url || 'unknown', time: responseTime, status: statusCode });

      while (i < lines.length && !lines[i].includes('╚═')) {
        rawLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) { rawLines.push(lines[i]); i++; }

      let headers: LogHeader[] = [];
      let body = '';

      while (i < lines.length) {
        const nextLine = lines[i]?.replace(/^I\/flutter\s*\(\d+\):\s?/, '').trim();
        if (!nextLine) { rawLines.push(lines[i]); i++; continue; }

        if (nextLine.includes('╔') && nextLine.includes('Headers')) {
          rawLines.push(lines[i]); i++;
          const section = collectSection(lines, i);
          headers = parseHeaders(section.content);
          for (let j = i; j < section.endIdx; j++) rawLines.push(lines[j]);
          i = section.endIdx;
        } else if (nextLine.includes('╔') && (nextLine.includes('Body') || nextLine === '╔ Body')) {
          rawLines.push(lines[i]); i++;
          const section = collectSection(lines, i);
          body = parseBody(section.content);
          for (let j = i; j < section.endIdx; j++) rawLines.push(lines[j]);
          i = section.endIdx;
        } else if (nextLine.startsWith('║') && !nextLine.includes('╔╣')) {
          rawLines.push(lines[i]);
          i++;
        } else {
          break;
        }
      }

      entries.push({
        id: `entry-${entryId++}`,
        type: 'response',
        method,
        url,
        statusCode,
        responseTime,
        headers,
        body: body || undefined,
        rawLines,
        lineStart: entryStartLine,
        lineEnd: i - 1,
      });
      continue;
    }

    // DioError entry
    const errorMatch = stripped.match(/╔╣\s*DioError\s*║\s*Status:\s*(\d+)\s*║?\s*Time:\s*(\d+)\s*ms/);
    if (errorMatch) {
      totalErrors++;
      const statusCode = parseInt(errorMatch[1]);
      const responseTime = parseInt(errorMatch[2]);
      const entryStartLine = i;
      const rawLines: string[] = [line];
      i++;

      const url = extractUrl(lines, i);

      statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;
      allResponseTimes.push({ url: url || 'unknown', time: responseTime, status: statusCode });

      if (url) {
        const endpoint = url.replace(/https?:\/\/[^/]+/, '');
        if (!endpoints[endpoint]) {
          endpoints[endpoint] = { count: 0, avgTime: 0, errors: 0, times: [] };
        }
        endpoints[endpoint].times.push(responseTime);
        endpoints[endpoint].errors++;
      }

      while (i < lines.length && !lines[i].includes('╚═')) {
        rawLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) { rawLines.push(lines[i]); i++; }

      let body = '';
      let errorType = '';

      while (i < lines.length) {
        const nextLine = lines[i]?.replace(/^I\/flutter\s*\(\d+\):\s?/, '').trim();
        if (!nextLine) { rawLines.push(lines[i]); i++; continue; }

        if (nextLine.includes('╔') && nextLine.includes('DioExceptionType')) {
          errorType = nextLine.replace(/╔\s*/, '').trim();
          rawLines.push(lines[i]); i++;
          const section = collectSection(lines, i);
          body = parseBody(section.content);
          for (let j = i; j < section.endIdx; j++) rawLines.push(lines[j]);
          i = section.endIdx;
        } else if (nextLine.startsWith('║') || nextLine.includes('╔')) {
          rawLines.push(lines[i]);
          i++;
        } else {
          break;
        }
      }

      // Collect trailing error messages
      let errorMessage = '';
      while (i < lines.length) {
        const nextLine = lines[i]?.replace(/^I\/flutter\s*\(\d+\):\s?/, '').trim();
        if (!nextLine) { i++; continue; }
        if (nextLine.includes('Heartbeat error:') || nextLine.includes('DioException') ||
            nextLine.includes('status code') || nextLine.includes('Read more') ||
            nextLine.includes('resolve this') || nextLine.includes('<asynchronous')) {
          errorMessage += (errorMessage ? '\n' : '') + nextLine;
          rawLines.push(lines[i]);
          i++;
        } else {
          break;
        }
      }

      entries.push({
        id: `entry-${entryId++}`,
        type: 'error',
        url,
        statusCode,
        responseTime,
        body: body || undefined,
        errorType,
        errorMessage: errorMessage || undefined,
        rawLines,
        lineStart: entryStartLine,
        lineEnd: i - 1,
      });
      continue;
    }

    // Standalone response status line (Status: 8 pattern - failed/timeout)
    const statusOnlyMatch = stripped.match(/╔╣\s*Response\s*║\s*(GET|POST|PUT|DELETE|PATCH)\s*║\s*Status:\s*(\d+)/);
    if (statusOnlyMatch && !responseMatch) {
      totalResponses++;
      const method = statusOnlyMatch[1];
      const statusCode = parseInt(statusOnlyMatch[2]);
      const entryStartLine = i;
      const rawLines: string[] = [line];
      i++;

      const url = extractUrl(lines, i);
      statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;

      while (i < lines.length && !lines[i].includes('╚═')) {
        rawLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) { rawLines.push(lines[i]); i++; }

      entries.push({
        id: `entry-${entryId++}`,
        type: 'response',
        method,
        url,
        statusCode,
        rawLines,
        lineStart: entryStartLine,
        lineEnd: i - 1,
      });
      continue;
    }

    // Info/raw log lines
    if (stripped && !stripped.match(/^[╔╗╚╝═║╟]+$/) && !stripped.match(/^$/)) {
      const infoLine = stripped.replace(/^[║╟╔╚═\s]+/, '').trim();
      if (infoLine && infoLine.length > 1) {
        // Collect consecutive info lines
        const rawLines = [line];
        const startLine = i;
        i++;
        while (i < lines.length) {
          const next = lines[i]?.replace(/^I\/flutter\s*\(\d+\):\s?/, '').trim();
          if (next && !next.includes('╔╣') && !next.match(/^[╔╗╚╝═]+$/) && !next.includes('Lifecycle') && !next.includes('heartbeat')) {
            if (next.startsWith('║') || next.startsWith('╟')) {
              rawLines.push(lines[i]);
              i++;
            } else {
              break;
            }
          } else {
            break;
          }
        }

        entries.push({
          id: `entry-${entryId++}`,
          type: 'info',
          rawLines,
          body: infoLine,
          lineStart: startLine,
          lineEnd: i - 1,
        });
        continue;
      }
    }

    i++;
  }

  // Calculate endpoint averages
  for (const key of Object.keys(endpoints)) {
    const ep = endpoints[key];
    if (ep.times.length > 0) {
      ep.avgTime = Math.round(ep.times.reduce((a, b) => a + b, 0) / ep.times.length);
    }
  }

  const times = allResponseTimes.map(r => r.time);
  const stats: LogStats = {
    totalRequests,
    totalResponses,
    totalErrors,
    statusCodes,
    avgResponseTime: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
    maxResponseTime: times.length > 0 ? Math.max(...times) : 0,
    minResponseTime: times.length > 0 ? Math.min(...times) : 0,
    responseTimes: allResponseTimes,
    endpoints,
    lifecycleEvents,
    timeRange: { start: firstTimestamp, end: lastTimestamp },
    errorRate: totalResponses > 0 ? Math.round((totalErrors / (totalResponses + totalErrors)) * 100) : 0,
  };

  return { deviceInfo, entries, stats };
}
