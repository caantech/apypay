# mpesa backend using supabase

This is a simple backend implementation for handling M-Pesa transactions using Supabase as the database.

## Steps taken:-

- ran `supabase init` to initialize a new Supabase project.
- ran `supabase start` to start the local Supabase development environment.

```bash


    Database URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
     Mailpit URL: http://127.0.0.1:54324
 Publishable key: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
      Secret key: sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
   S3 Access Key: 625729a08b95bf1b7ff351a663f3a23c
   S3 Secret Key: 850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907
       S3 Region: local

```

- How to create a new function

  - ran `supabase functions new direct-stk` to create a new function named `direct-stk`.
  - got error

```error
Missing version in specifier
Add a version requirement after the package namedeno-lint(no-unversioned-import)
Resolved Dependency

Code: jsr​:​@supabase/functions-js/edge-runtime.d.ts (https://jsr.io/@supabase/functions-js/2.86.0/src/edge-runtime.d.ts)
 ```

  <!-- ignore -->
  <!-- - ran `supabase functions serve direct-stk` to test the function locally. -->

## error report and fixes

### Missing Version in JSR Specifier

**Error Encountered:** When creating the `direct-stk` function with `supabase functions new direct-stk`, deno-lint threw an error: "Missing version in specifier - Add a version requirement after the package name" for the import `jsr:@supabase/functions-js/edge-runtime.d.ts`.

**Root Cause:** The JSR (JavaScript Registry) requires all package imports to include explicit version specifiers. Unlike NPM where version specifiers are optional and can default to latest, JSR mandates semantic versioning constraints. The generated template from Supabase contained an unversioned import, which violates JSR's strict requirements and causes linting failures in Deno projects.

**Solution Applied:** Updated the import statement in `supabase/functions/direct-stk/index.ts` from:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
```

to:

```typescript
import "jsr:@supabase/functions-js@^2.86.0/edge-runtime.d.ts"
```

The `@^2.86.0` version specifier uses caret syntax, allowing minor and patch updates while maintaining API compatibility with version 2.86.0. This resolves the linting error and follows JSR best practices for dependency management in Deno environments.
