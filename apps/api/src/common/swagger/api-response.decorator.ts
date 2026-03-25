import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

class ApiMetaDto {
  timestamp!: string;
  version!: string;
}

class ApiErrorDto {
  code!: string;
  message!: string;
  field?: string;
  details?: unknown;
}

class ApiEnvelopeDto {
  success!: boolean;
  data!: unknown;
  error!: ApiErrorDto | null;
  meta!: ApiMetaDto;
}

interface SuccessOptions {
  status?: number;
  description: string;
  dataModel?: Type<unknown>;
  example?: Record<string, unknown>;
}

interface ErrorOptions {
  status: number;
  description: string;
  exampleCode: string;
  exampleMessage: string;
}

export function ApiSuccessResponse(options: SuccessOptions) {
  const status = options.status ?? 200;
  const models: Array<Type<unknown>> = [ApiEnvelopeDto, ApiMetaDto, ApiErrorDto];
  if (options.dataModel) models.push(options.dataModel);

  const schema = options.dataModel
    ? {
        allOf: [
          { $ref: getSchemaPath(ApiEnvelopeDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(options.dataModel) },
              error: { nullable: true, example: null },
            },
          },
        ],
      }
    : {
        allOf: [
          { $ref: getSchemaPath(ApiEnvelopeDto) },
          {
            properties: {
              data: { example: options.example?.data ?? null },
              error: { nullable: true, example: null },
              meta: {
                example: {
                  timestamp: '2026-03-23T16:30:00.000Z',
                  version: 'v1',
                },
              },
            },
          },
        ],
      };

  return applyDecorators(
    ApiExtraModels(...models),
    ApiResponse({
      status,
      description: options.description,
      schema,
      example: options.example,
    }),
  );
}

export function ApiErrorResponse(options: ErrorOptions) {
  return applyDecorators(
    ApiExtraModels(ApiEnvelopeDto, ApiMetaDto, ApiErrorDto),
    ApiResponse({
      status: options.status,
      description: options.description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiEnvelopeDto) },
          {
            properties: {
              success: { example: false },
              data: { nullable: true, example: null },
              error: {
                example: {
                  code: options.exampleCode,
                  message: options.exampleMessage,
                },
              },
              meta: {
                example: {
                  timestamp: '2026-03-23T16:30:00.000Z',
                  version: 'v1',
                },
              },
            },
          },
        ],
      },
    }),
  );
}

