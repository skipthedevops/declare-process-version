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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
        const integrationId = core.getInput('application-integration-id');
        const tag = core.getInput('tag');
        const autoDeploy = core.getInput('auto-deploy');
        const integrationToken = core.getInput('integration-token');
        let versionName = core.getInput('name');
        versionName = versionName.length == 0 ? null : versionName;
        console.log(`Logging in with supplied integration token`);
        await post("/v1/account/login", {
            integrationToken: integrationToken
        });
        console.log(`Submitting new application version, integrationId=${integrationId}, tag=${tag}, autoDeploy=${autoDeploy}, versionName=${versionName}`);
        await post("/v1/process/version", {
            integrationId: integrationId,
            dockerImageTag: tag,
            autoDeploy: autoDeploy.toLowerCase() == "true",
            versionName: versionName
        });
    }
    catch (error) {
        core.setFailed(error?.message ?? error);
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
        const bodyString = JSON.stringify(body);
        let request = https_1.default.request(options, res => {
            const statusCode = res.statusCode ?? 0;
            if (statusCode < 200 || statusCode >= 300) {
                const message = `ERROR Recieved status code ${res.statusCode} when calling ${apiHost}${path}`;
                console.log(message);
                reject(message);
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
                    const message = `Received status code ${statusCode}.  Response: ${dataString}.`;
                    console.log(message);
                    reject(message);
                }
            });
        });
        request.on("error", (error) => {
            const message = `Error calling ${apiHost}${path}. ${error}`;
            console.log(message);
            reject(message);
        });
        request.write(bodyString);
        request.end();
    });
}
void main();
//# sourceMappingURL=index.js.map