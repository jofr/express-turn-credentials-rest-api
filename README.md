# express-turn-credentials-rest-api

Express middleware implementing the REST API for ephemeral TURN credentials as described in [this draft](https://datatracker.ietf.org/doc/html/draft-uberti-behave-turn-rest-00) and implemented in [coturn](https://github.com/coturn/coturn).

The REST API needs to be configured in two places. The TURN server needs to be configured to accept the ephemeral credentials (see e.g. [the documentation of coturn about how to do that](https://github.com/coturn/coturn)) and then there has to be another server actually handing out the credentials by implementing the REST API specified in the draft. This express middleware can be used for that.

## Install

```bash
npm install @jofr/express-turn-credentials-rest-api
```

## Usage

Import using either ECMAScript or CommonJS module system via

```typescript
import { turnCredentials } from "@jofr/express-turn-credentials-rest-api" // ECMAScript
const turnCredentials = require("@jofr/express-turn-credentials-rest-api") // CommonJS
```

and then just use it like any other middleware, e.g.

```typescript
const app = express();
app.get("/credentials", turnCredentials(options));
```

would give you ephemeral TURN credentials on HTTP GET requests to `/credentials` (possible [options are explained below](#options)). Can be combined with the `cors` middleware to specify origins from which the credentials are accessible, e.g.

```typescript
app.get("/credentials", cors({ origin: "https://example.com" }), turnCredentials(options));
```
would only allow access to the TURN credentials from web page scripts on `https://example.com`.

## Options

The `options` object is of type `TurnCredentialsOptions`

```typescript
type TurnCredentialsOptions = {
    sharedSecret: string | SharedSecretFunction,
    requireServiceQuery?: boolean, // default: false
    separator?: string, // default: ":"
    ttl?: number, // default: 24 hours
    uris?: string[],
    apiKey?: string | string[] | CheckApiKeyFunction,
}
```

where `sharedSecret` is mandatory and either the secret shared with the TURN server itself or a function that must return the secret (useful e.g. if the secret changes periodically and/or is stored in a database).

All other parameters are optional: `requiresServiceQuery` can be set to `true` if the credentials should only be returned if the request includes the `?service=turn` query parameter (as defined in the draft). Set this to `true` if there is other middleware (chained after the TURN credentials) that should be called in case the query parameter is missing. `separator` can be used to specify the timestamp/username separator (as in the `--rest-api-separator` option in `coturn`) but does not have to be set if the colon (as defined in the draft) is used. `ttl` and `uris` can be set to specifiy the duration for which the credentials are valid (default 24 hours) and the TURN URLs which should be returned (as defined for the response (in the draf)[https://datatracker.ietf.org/doc/html/draft-uberti-behave-turn-rest-00#section-2.2]). `apiKey` can be a valid API key, a list of valid API keys or a function that takes a key as first parameter and returns `true` or `false` if the key is valid or not valid respectively. If that option is set the credentials will only be returned if the GET requests includes a `?key=xyz` parameter where `xyz` has to be a valid API key (compare the (draft)[https://datatracker.ietf.org/doc/html/draft-uberti-behave-turn-rest-00#section-2.1]).