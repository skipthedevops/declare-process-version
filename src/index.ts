import https from "https"

import * as core from "@actions/core"

const apiHost = "api.alpha.skipthedevops.com"

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
        let options = {
            hostname: apiHost,
            port: 443,
            path: path,
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
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
                    resolve(JSON.parse(dataString))
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