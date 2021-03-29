"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const os = __importStar(require("os"));
const tc = __importStar(require("@actions/tool-cache"));
const exec_1 = require("@actions/exec");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const tag = core.getInput("gqldoc-version");
            if (!tag) {
                throw new Error("tag not specified");
            }
            const headers = core.getInput("header").split(",");
            const queries = core.getInput("query").split(",");
            const schema = core.getInput("schema").split(",");
            const output = core.getInput("output");
            const pushBranch = core.getInput("push-branch");
            yield gqldocInstall(tag);
            let args = [];
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
            yield exec_1.exec("gqldoc", args);
            yield exec_1.exec("git", [
                "config",
                "--local",
                "user.name",
                "github-actions[bot]",
            ]);
            yield exec_1.exec("git", [
                "config",
                "--local",
                "user.email",
                "github-actions[bot]@users.noreply.github.com",
            ]);
            yield exec_1.exec("git", ["add", "."]);
            yield exec_1.exec("git", ["commit", "-m", "Update GraphQL document"]);
            if (pushBranch !== "") {
                yield exec_1.exec("git", ["push", "origin", pushBranch]);
            }
            else {
                yield exec_1.exec("git", ["push"]);
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function gqldocInstall(tag) {
    return __awaiter(this, void 0, void 0, function* () {
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
                throw new Error("Unsupported operating system (Darwin, Linux and Windows)");
        }
        let getReleaseUrl;
        if (tag === "latest") {
            getReleaseUrl = yield octokit.repos.getLatestRelease({
                owner: "Code-Hex",
                repo: "gqldoc",
            });
        }
        else {
            getReleaseUrl = yield octokit.repos.getReleaseByTag({
                owner: "Code-Hex",
                repo: "gqldoc",
                tag: tag,
            });
        }
        let re = new RegExp(`${osPlatform}.*${arch}.*${osPlatform === "Windows" ? "*zip" : "*tar.gz"}`);
        let asset = getReleaseUrl.data.assets.find((obj) => {
            return re.test(obj.name);
        });
        if (!asset) {
            const found = getReleaseUrl.data.assets.map((f) => f.name);
            throw new Error(`Could not find a release for ${tag}. Found: ${found}`);
        }
        const url = asset.browser_download_url;
        core.info(`Downloading from ${url}`);
        const binPath = yield tc.downloadTool(url);
        let extractedPath = yield tc.extractTar(binPath);
        core.info(`Successfully extracted to ${extractedPath}`);
        core.addPath(extractedPath);
    });
}
run();
