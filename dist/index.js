"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = __importDefault(require("https"));
const core = __importStar(require("@actions/core"));
const apiHost = "api.alpha.skipthedevops.com";
const authCookieName = "X-SKIPTHEDEVOPS-AUTHORIZATION";
let authToken = null;
async function main() {
    try {
        const processId = core.getInput('process-id');
        const tag = core.getInput('tag');
        const autoDeploy = core.getInput('auto-deploy');
        const integrationToken = core.getInput('integration-token');
        console.log(`Logging in with supplied integration token`);
        await post("/v1/account/login", {
            integrationToken: integrationToken
        });
        console.log(`Submitting new process version, processId=${processId}, tag=${tag}, autoDeploy=${autoDeploy}`);
        await post("/v1/process/version", {
            processId: processId,
            dockerImageTag: tag,
            autoDeploy: autoDeploy
        });
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
async function post(path, body) {
    return new Promise((resolve, reject) => {
        const headers = {
            "Content-Type": "application/json"
        };
        if (authToken != null) {
            headers["cookie"] = `${authCookieName}=${authToken}`;
        }
        let options = {
            hostname: apiHost,
            port: 443,
            path: path,
            method: "POST",
            headers: headers,
        };
        let request = https_1.default.request(options, res => {
            const statusCode = res.statusCode ?? 0;
            if (statusCode < 200 || statusCode >= 300) {
                reject(`ERROR Recieved status code ${res.statusCode} when calling get ${path}`);
            }
            let dataString = "";
            res.on("data", d => {
                dataString += d.toString("utf8");
            });
            res.on("close", () => {
                if (statusCode >= 200 && statusCode < 300) {
                    const setCookieHeader = res.headers["set-cookie"] ?? [];
                    for (let cookie of setCookieHeader) {
                        const cookieTokens = cookie.split("=");
                        if (cookieTokens.length >= 2 && cookieTokens[0] == authCookieName) {
                            const valueTokens = cookieTokens[1].split(';');
                            if (valueTokens.length >= 1) {
                                authToken = valueTokens[0];
                            }
                        }
                    }
                    resolve();
                }
                else {
                    console.error(dataString);
                }
            });
        });
        request.on("error", (error) => {
            console.log(`Error. ${error}`);
            reject(null);
        });
        request.write(JSON.stringify(body));
        request.end();
    });
}
main();
//# sourceMappingURL=index.js.map