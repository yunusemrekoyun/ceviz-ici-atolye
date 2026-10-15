const { spawn } = require("node:child_process");

function runCommand(command, args, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 60_000);
  const maxOutputBytes = Number(options.maxOutputBytes || 2 * 1024 * 1024);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...(options.env || {}) },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const stdout = [];
    const stderr = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      child.kill("SIGKILL");
      const error = new Error(`Process timed out after ${timeoutMs}ms`);
      error.code = "PROCESS_TIMEOUT";
      reject(error);
      settled = true;
    }, timeoutMs);
    timer.unref();

    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes <= maxOutputBytes) stdout.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderrBytes += chunk.length;
      if (stderrBytes <= maxOutputBytes) stderr.push(chunk);
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const output = {
        code,
        signal,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      };
      if (code === 0) {
        resolve(output);
        return;
      }
      const error = new Error(
        output.stderr.trim() || `${command} exited with code ${code}`
      );
      error.code = "PROCESS_FAILED";
      error.exitCode = code;
      error.stderr = output.stderr;
      reject(error);
    });
  });
}

module.exports = { runCommand };
