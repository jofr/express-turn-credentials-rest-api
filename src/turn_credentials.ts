import { createHmac } from "node:crypto";

type CheckApiKeyFunction = (key: string) => boolean;

type SharedSecretFunction = () => string;

type TurnCredentialsOptions = {
    sharedSecret: string | SharedSecretFunction,
    requireServiceQuery?: boolean,
    separator?: string,
    ttl?: number,
    uris?: string[],
    apiKey?: string | string[] | CheckApiKeyFunction,
}

function getSharedSecretFunction(sharedSecretOption: string | SharedSecretFunction): SharedSecretFunction {
    if (sharedSecretOption instanceof Function) {
        return sharedSecretOption;
    } else {
        return () => sharedSecretOption;
    }
}

function getCheckApiKeyFunction(apiKeyOption: string | string[] | CheckApiKeyFunction | undefined): CheckApiKeyFunction {
    if (apiKeyOption instanceof Function) {
        return apiKeyOption;
    } else if (Array.isArray(apiKeyOption)) {
        return (key: string) => apiKeyOption.includes(key);
    } else if (typeof apiKeyOption === "string") {
        return (key: string) => key === apiKeyOption;
    } else {
        return null;
    }
}

export function turnCredentials(options: TurnCredentialsOptions) {
    if (!options.sharedSecret) {
        throw new Error("No shared secret provided for TURN credentials REST API");
    }

    const separator = options.separator || ":";
    const ttl = (typeof options.ttl === "number" && !isNaN(options.ttl as number)) ? options.ttl : 86400; // 86400 seconds = 24 hours
    const uris = options.uris || [];
    const sharedSecret = getSharedSecretFunction(options.sharedSecret);
    const checkApiKey = getCheckApiKeyFunction(options.apiKey);

    return function(req, res, next) {
        const service = req.query.service;
        const username = req.query.username;
        const key = req.query.key;

        if (options.requireServiceQuery && service !== "turn") {
            return next();
        }

        if (checkApiKey !== null && !checkApiKey(key)) {
            return next();
        }

        const expirationTimestamp = Math.floor(Date.now()/1000) + ttl;
        const turnUsername = username ? `${expirationTimestamp}${separator}${username}` : `${expirationTimestamp}`;
        const hmac = createHmac("sha1", sharedSecret());
        hmac.update(turnUsername);
        const turnPassword = hmac.digest("base64");

        res.writeHead(200, { "Conent-Type": "application/json" });
        res.end(JSON.stringify({
            username: turnUsername,
            password: turnPassword,
            ttl: ttl,
            uris: uris
        }));
    }
}