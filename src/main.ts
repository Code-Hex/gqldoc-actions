import * as core from "@actions/core";
import * as github from "@actions/github";
import * as os from "os";
import * as tc from "@actions/tool-cache";
import { exec } from "@actions/exec";

async function run() {
  try {
    const tag = core.getInput("gqldoc-version");
    if (!tag) {
      throw new Error("tag not specified");
    }

    const headers = core.getInput("header").split(",");
    const queries = core.getInput("query").split(",");
    const schema = core.getInput("schema").split(",");
    const output = core.getInput("output");

    await gqldocInstall(tag);

    let args: string[] = [];

    if (headers[0] !== "") {
      headers.forEach((v) => {
        args.push("-x");
        args.push(v);
      });
    }
    if (queries[0] !== "") {
      queries.forEach((v) => {
        args.push("-q");
        args.push(v);
      });
    }
    if (schema[0] !== "") {
      schema.forEach((v) => {
        args.push("-s");
        args.push(v);
      });
    }
    if (output !== "") {
      args.push("-o", output);
    }

    await exec("gqldoc", args);

    await exec("git", [
      "config",
      "--local",
      "user.name",
      "github-actions[bot]",
    ]);
    await exec("git", [
      "config",
      "--local",
      "user.email",
      "github-actions[bot]@users.noreply.github.com",
    ]);

    await exec("git", ["add", "-N", "."]);
    const resultDiff = await exec("git", ["diff", "--exit-code", "--quiet"], {
      ignoreReturnCode: true,
    });
    if (resultDiff !== 0) {
      await exec("git", ["commit", "-m", "Update GraphQL document", "-a"]);
      await gitPush();
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function gitPush() {
  const token = core.getInput("github-token", { required: true });
  const actor = process.env.GITHUB_ACTOR ?? "";
  const repo = process.env.GITHUB_REPOSITORY ?? "";
  const remote = `https://${actor}:${token}@github.com/${repo}.git`;
  const pushBranch = getBranchName();
  await exec("git", [remote, "push", "origin", pushBranch]);
}

async function gqldocInstall(tag: string) {
  const token = core.getInput("github-token", { required: true });
  const octokit = github.getOctokit(token);

  let osPlatform = "";
  let arch = "";
  switch (os.platform()) {
    case "linux":
      osPlatform = "Linux";
      switch (os.arch()) {
        case "arm":
          arch = "arm";
          break;
        case "arm64":
          arch = "arm64";
          break;
        case "x32":
          arch = "i386";
          break;
        case "x64":
          arch = "x86_64";
          break;
        default:
          throw new Error("supported arm, arm64, x32, x64 in Linux");
      }
      break;
    case "darwin":
      osPlatform = "macOS";
      switch (os.arch()) {
        case "arm64":
          arch = "arm64";
          break;
        case "x64":
          arch = "x86_64";
          break;
        default:
          throw new Error("supported arm64, x64 in macOS");
      }
      break;
    case "win32":
      osPlatform = "Windows";
      switch (os.arch()) {
        case "x32":
          arch = "i386";
          break;
        case "x64":
          arch = "x86_64";
          break;
        default:
          throw new Error("supported x32, x64 in Windows");
      }
      break;
    default:
      throw new Error(
        "Unsupported operating system (Darwin, Linux and Windows)"
      );
  }

  let getReleaseUrl;
  if (tag === "latest") {
    getReleaseUrl = await octokit.repos.getLatestRelease({
      owner: "Code-Hex",
      repo: "gqldoc",
    });
  } else {
    getReleaseUrl = await octokit.repos.getReleaseByTag({
      owner: "Code-Hex",
      repo: "gqldoc",
      tag: tag,
    });
  }

  let re = new RegExp(
    `${osPlatform}.*${arch}.*${osPlatform === "Windows" ? "zip" : "tar.gz"}`
  );
  let asset = getReleaseUrl.data.assets.find((obj) => {
    return re.test(obj.name);
  });

  if (!asset) {
    const found = getReleaseUrl.data.assets.map((f) => f.name);
    throw new Error(`Could not find a release for ${tag}. Found: ${found}`);
  }

  const url = asset.browser_download_url;
  core.info(`Downloading from ${url}`);
  const binPath = await tc.downloadTool(url);
  let extractedPath = await tc.extractTar(binPath);
  core.info(`Successfully extracted to ${extractedPath}`);
  core.addPath(extractedPath);
}

function getBranchName() {
  const ref = process.env.GITHUB_REF?.split("/").slice(2).join("/");
  const source = process.env.GITHUB_HEAD_REF;
  if (github.context.payload.pull_request) {
    return source ?? "";
  }
  return ref ?? "";
}

run();
