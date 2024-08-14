import https from "https"

import * as core from "@actions/core"

const apiHost = "api.alpha.skipthedevops.com"
const authCookieName = "X-SKIPTHEDEVOPS-AUTHORIZATION"
let authToken: string | null = null

async function main() {
    try {
        const processId = core.getInput('process-id')
        const tag = core.getInput('tag')
        const autoDeploy = core.getInput('auto-deploy')
        const integrationToken = core.getInput('integration-token')

        console.log(`Logging in with supplied integration token`)
        await post("/v1/account/login", {
            integrationToken: integrationToken
        })

        console.log(`Submitting new process version, processId=${processId}, tag=${tag}, autoDeploy=${autoDeploy}`)
        await post("/v1/process/version", {
            processId: processId,
            dockerImageTag: tag,
            autoDeploy: autoDeploy
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
            headers["Cookie"] = `${authCookieName}=${authToken}`
        }
        let options = {
            hostname: apiHost,
            port: 443,
            path: path,
            method: "POST",
            headers: headers,
        }

        let request = https.request(options, res => {
            const statusCode = res.statusCode ?? 0
            if (statusCode < 200 || statusCode >= 300) {
                reject(`ERROR Recieved status code ${res.statusCode} when calling get ${path}`)
            }

            let dataString = ""
            res.on("data", d => {
                dataString += d.toString("utf8")
            })
            res.on("close", () => {
                if (statusCode >= 200 && statusCode < 300) {
                    const setCookieHeader = res.headers["set-cookie"]
                    for (let cookie in setCookieHeader) {
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
                    console.error(dataString)
                }
            })
        })

        request.on("error", (error: any) => {
            console.log(`Error. ${error}`)
            reject(null)
        })

        request.write(JSON.stringify(body))
        request.end()
    })
}

main()