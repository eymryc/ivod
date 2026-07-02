# Swagger Guide (iVOD API)

This guide defines the standard to document any new endpoint in `apps/api`.

## 1) Required decorators by endpoint type

- **Controller level**
  - `@ApiTags('<ModuleName>')`
  - `@ApiBearerAuth('BearerAuth')` for protected modules
- **Route level**
  - `@ApiOperation({ summary: '...' })`
  - `@ApiBody({ type: ...Dto })` for `POST/PUT/PATCH` with body
  - `@ApiParam(...)` for route params (`:id`, `:contentId`, etc.)
  - `@ApiQuery(...)` for query params (`page`, `limit`, filters)

## 2) Standard response envelope

All endpoints must follow API envelope:

- `success`
- `data`
- `error`
- `meta`

Use shared decorators from:

- `src/common/swagger/api-response.decorator.ts`

Prefer:

- `@ApiSuccessResponse({...})` for success responses
- `@ApiErrorResponse({...})` for error responses

Avoid large inline Swagger schemas in controllers.

## 3) Error documentation minimum

For protected routes, document at least:

- `401` unauthorized

For role-based routes, add:

- `403` forbidden

For resource routes, add:

- `404` not found

For validation/conflict routes, add:

- `400` validation error
- `409` conflict (if applicable)

## 4) DTO requirements

In request DTOs, always add:

- `@ApiProperty(...)` for required fields
- `@ApiPropertyOptional(...)` for optional fields
- realistic `example` values

Validation decorators (`class-validator`) and Swagger decorators must stay aligned.

## 5) Quick endpoint checklist

- [ ] Summary exists (`@ApiOperation`)
- [ ] Request documented (`@ApiBody`, `@ApiParam`, `@ApiQuery`)
- [ ] DTO fields have examples and optional/required clarity
- [ ] Success response uses `@ApiSuccessResponse`
- [ ] Error responses use `@ApiErrorResponse` + standard Swagger error decorators where relevant
- [ ] Build passes: `npm run build` (from `apps/api`)

