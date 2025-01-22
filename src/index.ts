import https from "https"

import * as core from "@actions/core"

const apiHost = "api.alpha.skipthedevops.com"
const authCookieName = "X-SKIPTHEDEVOPS-AUTHORIZATION"
let authToken: string | null = null

async function main() {
    try {
        const processId = core.getInput('application-integration-id')
        const tag = core.getInput('tag')
        const autoDeploy = core.getInput('auto-deploy')
        const integrationToken = core.getInput('integration-token')
        let versionName: string | null = core.getInput('name')
        versionName = versionName.length == 0 ? null : versionName

        console.log(`Logging in with supplied integration token`)
        await post("/v1/account/login", {
            integrationToken: integrationToken
        })

        console.log(`Submitting new process version, processId=${processId}, tag=${tag}, autoDeploy=${autoDeploy}, versionName=${versionName}`)
        await post("/v1/process/version", {
            processId: processId,
            dockerImageTag: tag,
            autoDeploy: autoDeploy.toLowerCase() == "true",
            versionName: versionName
        })
    } catch (error: any) {
        core.setFailed(error.message);
    }
}

async function post(path: string, body: any): Promise<void> {
    return new Promise((resolve, reject) => {
        const headers: Record<string, string> = {
            "Content-Type": "application/json"
        }
        if (authToken != null) {
            headers["cookie"] = `${authCookieName}=${authToken}`
        }
        let options = {
            hostname: apiHost,
            port: 443,
            path: path,
            method: "POST",
            headers: headers,
        }
        const bodyString = JSON.stringify(body)

        let request = https.request(options, res => {
            const statusCode = res.statusCode ?? 0
            if (statusCode < 200 || statusCode >= 300) {
                console.log(`ERROR Recieved status code ${res.statusCode} when calling ${apiHost}${path}`)
                reject(null)
            }

            let dataString = ""
            res.on("data", d => {
                dataString += d.toString("utf8")
            })
            res.on("close", () => {
                if (statusCode >= 200 && statusCode < 300) {
                    const setCookieHeader = res.headers["set-cookie"] ?? []
                    for (let cookie of setCookieHeader) {
                        const cookieTokens = cookie.split("=")
                        if (cookieTokens.length >= 2 && cookieTokens[0] == authCookieName) {
                            const valueTokens = cookieTokens[1].split(';')
                            if (valueTokens.length >= 1) {
                                authToken = valueTokens[0]
                            }
                        }
                    }
                    resolve()
                } else {
                    // GitHub will actively obfuscate any logged secrets in the body.
                    console.error(`Received status code ${statusCode}.  Data: ${dataString}.  Body: ${bodyString}`)
                }
            })
        })

        request.on("error", (error: any) => {
            console.log(`Error calling ${apiHost}${path}. ${error}`)
            reject(null)
        })

        request.write(bodyString)
        request.end()
    })
}

void main()