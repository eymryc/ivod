import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nestjs';
import { ApiResponse } from '@/common/types';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request  = ctx.getRequest<Request>();

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let code    = 'INTERNAL_ERROR';
    let message = 'Une erreur interne est survenue';
    let details: unknown;
    let field: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as any;

      if (Array.isArray(body?.message)) {
        code    = 'VALIDATION_ERROR';
        details = body.message;
        const first = body.message[0];
        if (typeof first === 'string') {
          message = first;
        } else if (first?.constraints) {
          message = Object.values(first.constraints as Record<string, string>).join(', ');
          field = first.property;
        } else if (first?.property) {
          message = `Donnée invalide : ${first.property}`;
          field = first.property;
        } else {
          message = 'Données invalides';
        }
      } else {
        code    = body?.code    ?? this.statusToCode(status);
        message = body?.message ?? exception.message;
      }

    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      ({ status, code, message, field } = this.handlePrismaKnown(exception));

    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status  = HttpStatus.BAD_REQUEST;
      code    = 'VALIDATION_ERROR';
      message = 'Données invalides envoyées à la base de données';
      details = process.env.NODE_ENV === 'development' ? exception.message : undefined;

    } else if (exception instanceof Error) {
      // Erreur non gérée — capturée par Sentry + log complet en développement
      this.captureToSentry(exception, request);
      this.logger.error(
        `[UNHANDLED] ${request.method} ${request.url} — ${exception.message}`,
        exception.stack,
      );
      if (process.env.NODE_ENV === 'development') {
        message = exception.message;
        details = exception.stack?.split('\n').slice(0, 6);
      }
    } else {
      this.captureToSentry(new Error(String(exception)), request);
      this.logger.error(`[UNKNOWN] ${request.method} ${request.url}`, String(exception));
    }

    this.logger.error(`${request.method} ${request.url} — ${status} ${code}`);

    const body: ApiResponse<null> = {
      success: false,
      data:    null,
      error: {
        code,
        message,
        field,
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version:   'v1',
      },
    };

    response.status(status).json(body);
  }

  private handlePrismaKnown(e: Prisma.PrismaClientKnownRequestError): {
    status: number; code: string; message: string; field?: string;
  } {
    switch (e.code) {
      case 'P2002': {
        const fields = (e.meta?.target as string[]) ?? [];
        return {
          status:  HttpStatus.CONFLICT,
          code:    'DUPLICATE_ENTRY',
          message: `Valeur déjà utilisée pour : ${fields.join(', ')}`,
          field:   fields[0],
        };
      }
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND,  code: 'NOT_FOUND',   message: 'Enregistrement introuvable' };
      case 'P2003':
        return { status: HttpStatus.BAD_REQUEST, code: 'FOREIGN_KEY', message: 'Référence invalide (clé étrangère)' };
      case 'P2014':
        return { status: HttpStatus.BAD_REQUEST, code: 'RELATION_VIOLATION', message: 'Violation de contrainte relationnelle' };
      default:
        this.logger.error(`Prisma ${e.code}: ${e.message}`);
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'DB_ERROR', message: 'Erreur base de données' };
    }
  }

  private captureToSentry(error: Error, request: Request): void {
    if (!process.env.SENTRY_DSN) return;
    Sentry.withScope((scope) => {
      scope.setTag('method', request.method);
      scope.setTag('url', request.url);
      Sentry.captureException(error);
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',   401: 'UNAUTHORIZED',  403: 'FORBIDDEN',
      404: 'NOT_FOUND',     409: 'CONFLICT',       422: 'UNPROCESSABLE',
      429: 'RATE_LIMITED',  500: 'INTERNAL_ERROR',
    };
    return map[status] ?? 'UNKNOWN_ERROR';
  }
}
